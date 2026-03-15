import WidgetKit
import SwiftUI

struct AgentStats: Codable {
    let totalChats: Int
    let satisfaction: Int
    let activeAgents: Int
    let lastUpdated: String
}

struct AgentProvider: TimelineProvider {
    func placeholder(in context: Context) -> AgentEntry {
        AgentEntry(date: Date(), stats: AgentStats(totalChats: 1234, satisfaction: 94, activeAgents: 3, lastUpdated: "Just now"))
    }

    func getSnapshot(in context: Context, completion: @escaping (AgentEntry) -> ()) {
        let entry = AgentEntry(date: Date(), stats: loadStats())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<AgentEntry>) -> ()) {
        let entry = AgentEntry(date: Date(), stats: loadStats())
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadStats() -> AgentStats {
        let defaults = UserDefaults(suiteName: "group.com.agentforge.app")
        if let data = defaults?.data(forKey: "agentStats"),
           let stats = try? JSONDecoder().decode(AgentStats.self, from: data) {
            return stats
        }
        return AgentStats(totalChats: 0, satisfaction: 0, activeAgents: 0, lastUpdated: "Not available")
    }
}

struct AgentEntry: TimelineEntry {
    let date: Date
    let stats: AgentStats
}

struct AgentForgeWidgetEntryView: View {
    var entry: AgentProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.05, green: 0.05, blue: 0.08),
                    Color(red: 0.08, green: 0.06, blue: 0.12)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "flame.fill")
                        .foregroundColor(.orange)
                        .font(.title3)
                    Text("Agent Forge")
                        .font(.headline)
                        .foregroundColor(.white)
                    Spacer()
                }

                Spacer()

                if family == .systemSmall {
                    VStack(alignment: .leading, spacing: 4) {
                        StatRow(icon: "message.fill", label: "Chats", value: "\(entry.stats.totalChats)")
                        StatRow(icon: "hand.thumbsup.fill", label: "Satisfaction", value: "\(entry.stats.satisfaction)%")
                        StatRow(icon: "cpu", label: "Agents", value: "\(entry.stats.activeAgents)")
                    }
                } else {
                    HStack(spacing: 20) {
                        StatBlock(icon: "message.fill", label: "Total Chats", value: "\(entry.stats.totalChats)", color: .blue)
                        StatBlock(icon: "hand.thumbsup.fill", label: "Satisfaction", value: "\(entry.stats.satisfaction)%", color: .green)
                        StatBlock(icon: "cpu", label: "Active Agents", value: "\(entry.stats.activeAgents)", color: .orange)
                    }
                }

                Text(entry.stats.lastUpdated)
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.4))
            }
            .padding()
        }
    }
}

struct StatRow: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(.orange)
                .font(.caption)
                .frame(width: 16)
            Text(label)
                .font(.caption)
                .foregroundColor(.white.opacity(0.6))
            Spacer()
            Text(value)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(.white)
        }
    }
}

struct StatBlock: View {
    let icon: String
    let label: String
    let value: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .foregroundColor(color)
                .font(.title3)
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.white)
            Text(label)
                .font(.caption2)
                .foregroundColor(.white.opacity(0.5))
        }
        .frame(maxWidth: .infinity)
    }
}

@main
struct AgentForgeWidget: Widget {
    let kind: String = "AgentForgeWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: AgentProvider()) { entry in
            AgentForgeWidgetEntryView(entry: entry)
                .containerBackground(.clear, for: .widget)
        }
        .configurationDisplayName("Agent Forge Stats")
        .description("View your AI agent performance at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
