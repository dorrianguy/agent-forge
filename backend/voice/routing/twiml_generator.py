"""
TwiML Generator for Agent Forge Voice

Generates TwiML (Twilio Markup Language) responses for call control:
- Answer calls and connect to LiveKit SIP bridge
- Transfer calls to other numbers/agents
- IVR menus with DTMF gathering
- Hold music and announcements
- Call recording and conferencing
"""

import logging
from typing import Optional, List, Dict, Any
from xml.etree.ElementTree import Element, SubElement, tostring

logger = logging.getLogger(__name__)


class TwiMLGenerator:
    """
    Generate TwiML responses for Twilio call control.

    TwiML is XML-based markup that instructs Twilio how to handle calls.
    This generator creates responses for various call scenarios.
    """

    def __init__(self, base_webhook_url: str = ""):
        """
        Initialize TwiML generator.

        Args:
            base_webhook_url: Base URL for webhook callbacks (e.g., https://example.com/api/voice)
        """
        self.base_webhook_url = base_webhook_url.rstrip('/')
        logger.info(f"TwiMLGenerator initialized with base URL: {self.base_webhook_url}")

    def generate_answer_twiml(
        self,
        agent_id: str,
        welcome_message: Optional[str] = None,
        voice: str = "Polly.Joanna",
        language: str = "en-US",
        record: bool = True,
        recording_status_callback: Optional[str] = None
    ) -> str:
        """
        Generate TwiML to answer a call and greet the caller.

        Args:
            agent_id: The voice agent ID handling the call
            welcome_message: Optional greeting message
            voice: TTS voice to use for greeting
            language: Language code for TTS
            record: Whether to record the call
            recording_status_callback: URL for recording status updates

        Returns:
            TwiML XML string
        """
        response = Element('Response')

        # Optional greeting
        if welcome_message:
            say = SubElement(response, 'Say', {
                'voice': voice,
                'language': language
            })
            say.text = welcome_message

        # Enable call recording
        if record:
            record_attrs = {'record': 'record-from-answer'}
            if recording_status_callback:
                record_attrs['recordingStatusCallback'] = recording_status_callback
                record_attrs['recordingStatusCallbackMethod'] = 'POST'

            # Recording is set on the Dial verb
            # We'll add it in the next step

        # Add agent metadata to response (for tracking)
        # Note: TwiML doesn't support custom attributes, so we'd track this server-side

        xml = tostring(response, encoding='unicode', method='xml')
        logger.debug(f"Generated answer TwiML for agent {agent_id}")
        return self._format_xml(xml)

    def generate_sip_connect_twiml(
        self,
        livekit_sip_uri: str,
        agent_id: str,
        from_number: str,
        to_number: str,
        record: bool = True,
        timeout: int = 30,
        status_callback: Optional[str] = None
    ) -> str:
        """
        Generate TwiML to connect call to LiveKit SIP endpoint.

        This bridges the Twilio call to a LiveKit room via SIP.

        Args:
            livekit_sip_uri: SIP URI for LiveKit (e.g., sip:room@sip.livekit.io)
            agent_id: Voice agent ID for metadata
            from_number: Caller's number
            to_number: Dialed number
            record: Whether to record the call
            timeout: Dial timeout in seconds
            status_callback: URL for dial status updates

        Returns:
            TwiML XML string
        """
        response = Element('Response')

        # Dial the LiveKit SIP URI
        dial_attrs = {
            'timeout': str(timeout),
            'record': 'record-from-answer' if record else 'do-not-record',
            'recordingStatusCallback': f"{self.base_webhook_url}/recording-status",
            'recordingStatusCallbackMethod': 'POST',
        }

        if status_callback:
            dial_attrs['action'] = status_callback
            dial_attrs['method'] = 'POST'

        dial = SubElement(response, 'Dial', dial_attrs)

        # SIP destination
        # Add custom headers to pass metadata to LiveKit
        sip_attrs = {
            'username': agent_id,  # LiveKit can use this to identify the agent
        }
        sip = SubElement(dial, 'Sip', sip_attrs)
        sip.text = livekit_sip_uri

        # Add custom SIP headers for metadata
        SubElement(sip, 'Header', {
            'name': 'X-Agent-ID',
            'value': agent_id
        })
        SubElement(sip, 'Header', {
            'name': 'X-From-Number',
            'value': from_number
        })
        SubElement(sip, 'Header', {
            'name': 'X-To-Number',
            'value': to_number
        })

        xml = tostring(response, encoding='unicode', method='xml')
        logger.debug(f"Generated SIP connect TwiML: {livekit_sip_uri}")
        return self._format_xml(xml)

    def generate_transfer_twiml(
        self,
        target_number: str,
        transfer_type: str = "warm",
        whisper_message: Optional[str] = None,
        timeout: int = 30,
        caller_id: Optional[str] = None
    ) -> str:
        """
        Generate TwiML to transfer a call to another number.

        Args:
            target_number: Phone number or SIP URI to transfer to
            transfer_type: 'warm' (announce first), 'cold' (immediate), or 'blind'
            whisper_message: Message to play to transfer target before connecting
            timeout: Ring timeout in seconds
            caller_id: Caller ID to display on transfer

        Returns:
            TwiML XML string
        """
        response = Element('Response')

        if transfer_type == "warm" and whisper_message:
            # Warm transfer - notify target before connecting
            dial_attrs = {
                'timeout': str(timeout),
            }
            if caller_id:
                dial_attrs['callerId'] = caller_id

            dial = SubElement(response, 'Dial', dial_attrs)
            number = SubElement(dial, 'Number')
            number.text = target_number

            # Whisper to transfer target
            whisper = SubElement(number, 'Whisper', {
                'voice': 'Polly.Joanna',
                'language': 'en-US'
            })
            whisper.text = whisper_message

        elif transfer_type == "cold":
            # Cold transfer - immediate connection
            say = SubElement(response, 'Say', {
                'voice': 'Polly.Joanna',
                'language': 'en-US'
            })
            say.text = "Transferring your call..."

            dial_attrs = {'timeout': str(timeout)}
            if caller_id:
                dial_attrs['callerId'] = caller_id

            dial = SubElement(response, 'Dial', dial_attrs)
            number = SubElement(dial, 'Number')
            number.text = target_number

        else:  # blind transfer
            # Blind transfer - redirect immediately
            dial_attrs = {'timeout': str(timeout)}
            if caller_id:
                dial_attrs['callerId'] = caller_id

            dial = SubElement(response, 'Dial', dial_attrs)
            SubElement(dial, 'Number').text = target_number

        xml = tostring(response, encoding='unicode', method='xml')
        logger.debug(f"Generated transfer TwiML: {target_number} ({transfer_type})")
        return self._format_xml(xml)

    def generate_gather_twiml(
        self,
        prompt: str,
        num_digits: int = 1,
        timeout: int = 5,
        finish_on_key: str = "#",
        action_url: Optional[str] = None,
        method: str = "POST",
        voice: str = "Polly.Joanna",
        language: str = "en-US",
        retry_count: int = 0,
        max_retries: int = 3
    ) -> str:
        """
        Generate TwiML to gather DTMF input (IVR menu).

        Args:
            prompt: Message to play before gathering input
            num_digits: Expected number of digits (1-30)
            timeout: Seconds to wait for input
            finish_on_key: Key to finalize input (typically '#')
            action_url: URL to POST gathered digits to
            method: HTTP method for action (POST or GET)
            voice: TTS voice for prompt
            language: Language code for TTS
            retry_count: Current retry attempt (for error handling)
            max_retries: Maximum retries before giving up

        Returns:
            TwiML XML string
        """
        response = Element('Response')

        # Build action URL
        if not action_url:
            action_url = f"{self.base_webhook_url}/gather-result"

        # Gather DTMF input
        gather_attrs = {
            'numDigits': str(num_digits),
            'timeout': str(timeout),
            'finishOnKey': finish_on_key,
            'action': action_url,
            'method': method.upper(),
        }
        gather = SubElement(response, 'Gather', gather_attrs)

        # Prompt message
        say = SubElement(gather, 'Say', {
            'voice': voice,
            'language': language
        })
        say.text = prompt

        # Fallback if no input received
        if retry_count < max_retries:
            fallback_say = SubElement(response, 'Say', {
                'voice': voice,
                'language': language
            })
            fallback_say.text = "We didn't receive your input. Please try again."

            # Redirect to retry
            retry_url = f"{action_url}?retry={retry_count + 1}"
            SubElement(response, 'Redirect', {'method': method.upper()}).text = retry_url
        else:
            # Max retries exceeded - transfer to operator
            final_say = SubElement(response, 'Say', {
                'voice': voice,
                'language': language
            })
            final_say.text = "We're having trouble with your input. Transferring to an operator."

            # Could add Dial to operator number here
            SubElement(response, 'Hangup')

        xml = tostring(response, encoding='unicode', method='xml')
        logger.debug(f"Generated gather TwiML: {num_digits} digits, timeout={timeout}s")
        return self._format_xml(xml)

    def generate_hold_music_twiml(
        self,
        message: str = "Please hold while we connect you.",
        music_url: Optional[str] = None,
        voice: str = "Polly.Joanna",
        language: str = "en-US"
    ) -> str:
        """
        Generate TwiML to play hold music.

        Args:
            message: Message to play before hold music
            music_url: URL of hold music MP3 (optional)
            voice: TTS voice for message
            language: Language code for TTS

        Returns:
            TwiML XML string
        """
        response = Element('Response')

        # Play message
        say = SubElement(response, 'Say', {
            'voice': voice,
            'language': language
        })
        say.text = message

        # Play hold music (loop)
        if music_url:
            SubElement(response, 'Play', {'loop': '0'}).text = music_url
        else:
            # Use Twilio's default hold music
            SubElement(response, 'Play', {'loop': '0'}).text = (
                'http://com.twilio.sounds.music.s3.amazonaws.com/ClockworkWaltz.mp3'
            )

        xml = tostring(response, encoding='unicode', method='xml')
        logger.debug("Generated hold music TwiML")
        return self._format_xml(xml)

    def generate_voicemail_twiml(
        self,
        greeting: str = "Please leave a message after the beep.",
        max_length: int = 120,
        transcribe: bool = True,
        transcribe_callback: Optional[str] = None,
        recording_callback: Optional[str] = None,
        voice: str = "Polly.Joanna",
        language: str = "en-US"
    ) -> str:
        """
        Generate TwiML to record a voicemail.

        Args:
            greeting: Greeting message before beep
            max_length: Maximum recording length in seconds
            transcribe: Whether to transcribe the recording
            transcribe_callback: URL for transcription callback
            recording_callback: URL for recording completion callback
            voice: TTS voice for greeting
            language: Language code for TTS

        Returns:
            TwiML XML string
        """
        response = Element('Response')

        # Play greeting
        say = SubElement(response, 'Say', {
            'voice': voice,
            'language': language
        })
        say.text = greeting

        # Record voicemail
        record_attrs = {
            'maxLength': str(max_length),
            'finishOnKey': '#',
            'playBeep': 'true',
        }

        if transcribe:
            record_attrs['transcribe'] = 'true'
            if transcribe_callback:
                record_attrs['transcribeCallback'] = transcribe_callback

        if recording_callback:
            record_attrs['recordingStatusCallback'] = recording_callback
            record_attrs['recordingStatusCallbackMethod'] = 'POST'

        SubElement(response, 'Record', record_attrs)

        # Thank you message after recording
        thanks = SubElement(response, 'Say', {
            'voice': voice,
            'language': language
        })
        thanks.text = "Thank you for your message. Goodbye."

        SubElement(response, 'Hangup')

        xml = tostring(response, encoding='unicode', method='xml')
        logger.debug("Generated voicemail TwiML")
        return self._format_xml(xml)

    def generate_conference_twiml(
        self,
        room_name: str,
        participant_label: Optional[str] = None,
        start_on_enter: bool = True,
        end_on_exit: bool = False,
        muted: bool = False,
        record: bool = False,
        wait_url: Optional[str] = None,
        status_callback: Optional[str] = None
    ) -> str:
        """
        Generate TwiML to join a conference call.

        Args:
            room_name: Conference room identifier
            participant_label: Label for this participant
            start_on_enter: Start conference when this participant joins
            end_on_exit: End conference when this participant leaves
            muted: Join muted
            record: Record the conference
            wait_url: Music/message to play while waiting
            status_callback: URL for conference status events

        Returns:
            TwiML XML string
        """
        response = Element('Response')

        dial = SubElement(response, 'Dial')

        conference_attrs = {
            'startConferenceOnEnter': 'true' if start_on_enter else 'false',
            'endConferenceOnExit': 'true' if end_on_exit else 'false',
        }

        if muted:
            conference_attrs['muted'] = 'true'

        if record:
            conference_attrs['record'] = 'record-from-start'

        if wait_url:
            conference_attrs['waitUrl'] = wait_url

        if status_callback:
            conference_attrs['statusCallback'] = status_callback
            conference_attrs['statusCallbackMethod'] = 'POST'
            conference_attrs['statusCallbackEvent'] = 'start end join leave mute hold'

        if participant_label:
            conference_attrs['participantLabel'] = participant_label

        conference = SubElement(dial, 'Conference', conference_attrs)
        conference.text = room_name

        xml = tostring(response, encoding='unicode', method='xml')
        logger.debug(f"Generated conference TwiML: room={room_name}")
        return self._format_xml(xml)

    def generate_hangup_twiml(
        self,
        message: Optional[str] = None,
        voice: str = "Polly.Joanna",
        language: str = "en-US"
    ) -> str:
        """
        Generate TwiML to end a call.

        Args:
            message: Optional goodbye message
            voice: TTS voice for message
            language: Language code for TTS

        Returns:
            TwiML XML string
        """
        response = Element('Response')

        if message:
            say = SubElement(response, 'Say', {
                'voice': voice,
                'language': language
            })
            say.text = message

        SubElement(response, 'Hangup')

        xml = tostring(response, encoding='unicode', method='xml')
        logger.debug("Generated hangup TwiML")
        return self._format_xml(xml)

    def generate_redirect_twiml(
        self,
        url: str,
        method: str = "POST"
    ) -> str:
        """
        Generate TwiML to redirect to another URL.

        Args:
            url: URL to redirect to
            method: HTTP method (POST or GET)

        Returns:
            TwiML XML string
        """
        response = Element('Response')
        SubElement(response, 'Redirect', {'method': method.upper()}).text = url

        xml = tostring(response, encoding='unicode', method='xml')
        logger.debug(f"Generated redirect TwiML: {url}")
        return self._format_xml(xml)

    def generate_play_twiml(
        self,
        audio_url: str,
        loop: int = 1,
        digits: Optional[str] = None
    ) -> str:
        """
        Generate TwiML to play an audio file or send DTMF tones.

        Args:
            audio_url: URL of audio file to play
            loop: Number of times to loop (0 = infinite)
            digits: DTMF digits to send (alternative to audio)

        Returns:
            TwiML XML string
        """
        response = Element('Response')

        if digits:
            # Send DTMF tones
            SubElement(response, 'Play', {'digits': digits})
        else:
            # Play audio file
            SubElement(response, 'Play', {'loop': str(loop)}).text = audio_url

        xml = tostring(response, encoding='unicode', method='xml')
        logger.debug(f"Generated play TwiML: {audio_url if not digits else f'digits={digits}'}")
        return self._format_xml(xml)

    def _format_xml(self, xml: str) -> str:
        """
        Format XML with proper declaration and cleanup.

        Args:
            xml: Raw XML string

        Returns:
            Formatted XML with declaration
        """
        # Add XML declaration if not present
        if not xml.startswith('<?xml'):
            xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + xml

        return xml


def create_ivr_flow(
    generator: TwiMLGenerator,
    menu_options: Dict[str, Any]
) -> str:
    """
    Helper function to create a complete IVR menu flow.

    Args:
        generator: TwiMLGenerator instance
        menu_options: Dict mapping digit inputs to actions

    Returns:
        TwiML for IVR menu
    """
    # Build prompt from menu options
    prompt_parts = ["Welcome to our automated system."]

    for digit, option in menu_options.items():
        if option.get('label'):
            prompt_parts.append(f"Press {digit} for {option['label']}.")

    prompt = " ".join(prompt_parts)

    # Generate gather TwiML
    return generator.generate_gather_twiml(
        prompt=prompt,
        num_digits=1,
        timeout=5,
        action_url=menu_options.get('action_url')
    )
