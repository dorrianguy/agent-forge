"""
Stripe Billing Integration for Agent Forge

Handles customer management, subscriptions, and payment processing
using Stripe as the payment provider.
"""

import os
import stripe
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging
import json

logger = logging.getLogger(__name__)


class BillingManager:
    """Manages Stripe billing operations"""

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.pricing = self.config.get('pricing', {})

        # Initialize Stripe with API key from environment
        stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
        self.webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')

        # Map plan names to Stripe price IDs (set via environment)
        self.price_ids = {
            'starter': os.getenv('STRIPE_PRICE_STARTER'),
            'professional': os.getenv('STRIPE_PRICE_PROFESSIONAL'),
            'enterprise': os.getenv('STRIPE_PRICE_ENTERPRISE')
        }

        # Cache for plans from config
        self.plans = self.pricing.get('plans', {})

    def is_configured(self) -> bool:
        """Check if Stripe is properly configured"""
        return bool(stripe.api_key)

    # ==================== Customer Management ====================

    def create_customer(
        self,
        email: str,
        name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a new Stripe customer"""
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata=metadata or {}
            )
            logger.info(f"Created Stripe customer: {customer.id}")
            return {
                'success': True,
                'customer_id': customer.id,
                'email': customer.email
            }
        except stripe.StripeError as e:
            logger.error(f"Failed to create customer: {e}")
            return {'success': False, 'error': str(e)}

    def get_customer(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a Stripe customer"""
        try:
            customer = stripe.Customer.retrieve(customer_id)
            return {
                'id': customer.id,
                'email': customer.email,
                'name': customer.name,
                'created': customer.created,
                'metadata': dict(customer.metadata) if customer.metadata else {}
            }
        except stripe.StripeError as e:
            logger.error(f"Failed to get customer {customer_id}: {e}")
            return None

    def update_customer(
        self,
        customer_id: str,
        email: Optional[str] = None,
        name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Update a Stripe customer"""
        try:
            update_data = {}
            if email:
                update_data['email'] = email
            if name:
                update_data['name'] = name
            if metadata:
                update_data['metadata'] = metadata

            customer = stripe.Customer.modify(customer_id, **update_data)
            return {'success': True, 'customer_id': customer.id}
        except stripe.StripeError as e:
            logger.error(f"Failed to update customer {customer_id}: {e}")
            return {'success': False, 'error': str(e)}

    # ==================== Subscription Management ====================

    def create_checkout_session(
        self,
        customer_id: str,
        plan: str,
        success_url: str,
        cancel_url: str
    ) -> Dict[str, Any]:
        """Create a Stripe Checkout session for subscription"""
        price_id = self.price_ids.get(plan)
        if not price_id:
            return {'success': False, 'error': f'Invalid plan: {plan}'}

        try:
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={'plan': plan}
            )
            logger.info(f"Created checkout session: {session.id}")
            return {
                'success': True,
                'session_id': session.id,
                'url': session.url
            }
        except stripe.StripeError as e:
            logger.error(f"Failed to create checkout session: {e}")
            return {'success': False, 'error': str(e)}

    def create_subscription(
        self,
        customer_id: str,
        plan: str,
        payment_method_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a subscription directly (for existing payment methods)"""
        price_id = self.price_ids.get(plan)
        if not price_id:
            return {'success': False, 'error': f'Invalid plan: {plan}'}

        try:
            subscription_data = {
                'customer': customer_id,
                'items': [{'price': price_id}],
                'metadata': {'plan': plan}
            }

            if payment_method_id:
                subscription_data['default_payment_method'] = payment_method_id

            subscription = stripe.Subscription.create(**subscription_data)
            logger.info(f"Created subscription: {subscription.id}")
            return {
                'success': True,
                'subscription_id': subscription.id,
                'status': subscription.status,
                'current_period_end': subscription.current_period_end
            }
        except stripe.StripeError as e:
            logger.error(f"Failed to create subscription: {e}")
            return {'success': False, 'error': str(e)}

    def get_subscription(self, subscription_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a subscription"""
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            return {
                'id': subscription.id,
                'status': subscription.status,
                'plan': subscription.metadata.get('plan'),
                'current_period_start': subscription.current_period_start,
                'current_period_end': subscription.current_period_end,
                'cancel_at_period_end': subscription.cancel_at_period_end,
                'canceled_at': subscription.canceled_at
            }
        except stripe.StripeError as e:
            logger.error(f"Failed to get subscription {subscription_id}: {e}")
            return None

    def cancel_subscription(
        self,
        subscription_id: str,
        immediately: bool = False
    ) -> Dict[str, Any]:
        """Cancel a subscription"""
        try:
            if immediately:
                subscription = stripe.Subscription.delete(subscription_id)
            else:
                subscription = stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True
                )
            logger.info(f"Cancelled subscription: {subscription_id}")
            return {
                'success': True,
                'subscription_id': subscription.id,
                'status': subscription.status
            }
        except stripe.StripeError as e:
            logger.error(f"Failed to cancel subscription {subscription_id}: {e}")
            return {'success': False, 'error': str(e)}

    def update_subscription(
        self,
        subscription_id: str,
        new_plan: str
    ) -> Dict[str, Any]:
        """Upgrade or downgrade a subscription"""
        price_id = self.price_ids.get(new_plan)
        if not price_id:
            return {'success': False, 'error': f'Invalid plan: {new_plan}'}

        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            subscription = stripe.Subscription.modify(
                subscription_id,
                items=[{
                    'id': subscription['items']['data'][0].id,
                    'price': price_id,
                }],
                metadata={'plan': new_plan},
                proration_behavior='create_prorations'
            )
            logger.info(f"Updated subscription {subscription_id} to plan {new_plan}")
            return {
                'success': True,
                'subscription_id': subscription.id,
                'new_plan': new_plan
            }
        except stripe.StripeError as e:
            logger.error(f"Failed to update subscription {subscription_id}: {e}")
            return {'success': False, 'error': str(e)}

    def list_customer_subscriptions(
        self,
        customer_id: str
    ) -> List[Dict[str, Any]]:
        """List all subscriptions for a customer"""
        try:
            subscriptions = stripe.Subscription.list(customer=customer_id)
            return [{
                'id': sub.id,
                'status': sub.status,
                'plan': sub.metadata.get('plan'),
                'current_period_end': sub.current_period_end
            } for sub in subscriptions.data]
        except stripe.StripeError as e:
            logger.error(f"Failed to list subscriptions for {customer_id}: {e}")
            return []

    # ==================== Payment Methods ====================

    def create_setup_intent(self, customer_id: str) -> Dict[str, Any]:
        """Create a SetupIntent for collecting payment method"""
        try:
            setup_intent = stripe.SetupIntent.create(
                customer=customer_id,
                payment_method_types=['card'],
            )
            return {
                'success': True,
                'client_secret': setup_intent.client_secret
            }
        except stripe.StripeError as e:
            logger.error(f"Failed to create setup intent: {e}")
            return {'success': False, 'error': str(e)}

    def list_payment_methods(self, customer_id: str) -> List[Dict[str, Any]]:
        """List payment methods for a customer"""
        try:
            payment_methods = stripe.PaymentMethod.list(
                customer=customer_id,
                type='card'
            )
            return [{
                'id': pm.id,
                'brand': pm.card.brand,
                'last4': pm.card.last4,
                'exp_month': pm.card.exp_month,
                'exp_year': pm.card.exp_year
            } for pm in payment_methods.data]
        except stripe.StripeError as e:
            logger.error(f"Failed to list payment methods: {e}")
            return []

    def set_default_payment_method(
        self,
        customer_id: str,
        payment_method_id: str
    ) -> Dict[str, Any]:
        """Set the default payment method for a customer"""
        try:
            stripe.Customer.modify(
                customer_id,
                invoice_settings={'default_payment_method': payment_method_id}
            )
            return {'success': True}
        except stripe.StripeError as e:
            logger.error(f"Failed to set default payment method: {e}")
            return {'success': False, 'error': str(e)}

    # ==================== Invoices & Billing History ====================

    def list_invoices(
        self,
        customer_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """List invoices for a customer"""
        try:
            invoices = stripe.Invoice.list(customer=customer_id, limit=limit)
            return [{
                'id': inv.id,
                'amount_due': inv.amount_due,
                'amount_paid': inv.amount_paid,
                'currency': inv.currency,
                'status': inv.status,
                'created': inv.created,
                'invoice_pdf': inv.invoice_pdf,
                'hosted_invoice_url': inv.hosted_invoice_url
            } for inv in invoices.data]
        except stripe.StripeError as e:
            logger.error(f"Failed to list invoices: {e}")
            return []

    def get_upcoming_invoice(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """Get the upcoming invoice for a customer"""
        try:
            invoice = stripe.Invoice.upcoming(customer=customer_id)
            return {
                'amount_due': invoice.amount_due,
                'currency': invoice.currency,
                'next_payment_attempt': invoice.next_payment_attempt,
                'lines': [{
                    'description': line.description,
                    'amount': line.amount
                } for line in invoice.lines.data]
            }
        except stripe.StripeError as e:
            logger.error(f"Failed to get upcoming invoice: {e}")
            return None

    # ==================== Portal ====================

    def create_portal_session(
        self,
        customer_id: str,
        return_url: str
    ) -> Dict[str, Any]:
        """Create a Stripe Customer Portal session"""
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url,
            )
            return {
                'success': True,
                'url': session.url
            }
        except stripe.StripeError as e:
            logger.error(f"Failed to create portal session: {e}")
            return {'success': False, 'error': str(e)}

    # ==================== Webhook Handling ====================

    def verify_webhook(
        self,
        payload: bytes,
        signature: str
    ) -> Optional[Dict[str, Any]]:
        """Verify and parse a Stripe webhook"""
        if not self.webhook_secret:
            logger.error("Webhook secret not configured")
            return None

        try:
            event = stripe.Webhook.construct_event(
                payload, signature, self.webhook_secret
            )
            return {
                'type': event.type,
                'data': event.data.object
            }
        except stripe.SignatureVerificationError as e:
            logger.error(f"Invalid webhook signature: {e}")
            return None
        except Exception as e:
            logger.error(f"Error processing webhook: {e}")
            return None

    def handle_webhook_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Process a webhook event and return action to take"""
        event_type = event.get('type')
        data = event.get('data')

        handlers = {
            'customer.subscription.created': self._handle_subscription_created,
            'customer.subscription.updated': self._handle_subscription_updated,
            'customer.subscription.deleted': self._handle_subscription_deleted,
            'invoice.paid': self._handle_invoice_paid,
            'invoice.payment_failed': self._handle_payment_failed,
            'checkout.session.completed': self._handle_checkout_completed,
        }

        handler = handlers.get(event_type)
        if handler:
            return handler(data)

        return {'action': 'ignored', 'event_type': event_type}

    def _handle_subscription_created(self, data) -> Dict[str, Any]:
        """Handle new subscription"""
        return {
            'action': 'subscription_created',
            'subscription_id': data.id,
            'customer_id': data.customer,
            'plan': data.metadata.get('plan'),
            'status': data.status
        }

    def _handle_subscription_updated(self, data) -> Dict[str, Any]:
        """Handle subscription update"""
        return {
            'action': 'subscription_updated',
            'subscription_id': data.id,
            'customer_id': data.customer,
            'plan': data.metadata.get('plan'),
            'status': data.status,
            'cancel_at_period_end': data.cancel_at_period_end
        }

    def _handle_subscription_deleted(self, data) -> Dict[str, Any]:
        """Handle subscription cancellation"""
        return {
            'action': 'subscription_deleted',
            'subscription_id': data.id,
            'customer_id': data.customer
        }

    def _handle_invoice_paid(self, data) -> Dict[str, Any]:
        """Handle successful payment"""
        return {
            'action': 'payment_succeeded',
            'invoice_id': data.id,
            'customer_id': data.customer,
            'amount_paid': data.amount_paid,
            'subscription_id': data.subscription
        }

    def _handle_payment_failed(self, data) -> Dict[str, Any]:
        """Handle failed payment"""
        return {
            'action': 'payment_failed',
            'invoice_id': data.id,
            'customer_id': data.customer,
            'amount_due': data.amount_due
        }

    def _handle_checkout_completed(self, data) -> Dict[str, Any]:
        """Handle completed checkout"""
        return {
            'action': 'checkout_completed',
            'session_id': data.id,
            'customer_id': data.customer,
            'subscription_id': data.subscription,
            'plan': data.metadata.get('plan')
        }

    # ==================== Usage & Limits ====================

    def get_plan_limits(self, plan: str) -> Dict[str, Any]:
        """Get limits for a plan from config"""
        plan_config = self.plans.get(plan, {})
        return {
            'agents': plan_config.get('agents', 0),
            'features': plan_config.get('features', []),
            'price': plan_config.get('price', 0)
        }

    def check_usage_limits(
        self,
        plan: str,
        current_agents: int,
        current_conversations: int
    ) -> Dict[str, Any]:
        """Check if usage is within plan limits"""
        limits = self.get_plan_limits(plan)
        max_agents = limits.get('agents', 0)

        # -1 means unlimited
        agents_ok = max_agents == -1 or current_agents < max_agents

        # Parse conversation limits from features
        conversations_ok = True  # Default to OK if not specified
        for feature in limits.get('features', []):
            if 'conversations' in feature.lower():
                if 'unlimited' not in feature.lower():
                    # Parse number from feature like "1,000 conversations/month"
                    import re
                    match = re.search(r'([\d,]+)\s*conversations', feature)
                    if match:
                        max_conversations = int(match.group(1).replace(',', ''))
                        conversations_ok = current_conversations < max_conversations

        return {
            'within_limits': agents_ok and conversations_ok,
            'agents_ok': agents_ok,
            'conversations_ok': conversations_ok,
            'max_agents': max_agents,
            'current_agents': current_agents
        }


# Singleton instance
_billing_manager: Optional[BillingManager] = None


def get_billing_manager(config: Dict[str, Any] = None) -> BillingManager:
    """Get or create the billing manager instance"""
    global _billing_manager
    if _billing_manager is None:
        _billing_manager = BillingManager(config)
    return _billing_manager
