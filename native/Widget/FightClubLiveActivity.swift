import ActivityKit
import WidgetKit
import SwiftUI

// Phase colors match the app: bright orange for work/cardio, cyan for rest.
private let workColor = Color(red: 1.0, green: 0.353, blue: 0.122)   // #FF5A1F
private let restColor = Color(red: 0.212, green: 0.773, blue: 0.941)  // #36C5F0
private let pausedColor = Color.white.opacity(0.55)

private typealias LAState = WorkoutActivityAttributes.ContentState

private func phaseColor(_ s: LAState) -> Color {
    if s.paused { return pausedColor }
    return s.phase == "REST" ? restColor : workColor
}

private func phaseLabel(_ s: LAState) -> String {
    if s.paused { return "PAUSED" }
    switch s.phase {
    case "REST": return "REST"
    case "BLOCK": return "CARDIO"
    default: return "WORK"
    }
}

private func progressLabel(_ s: LAState) -> String {
    let word = s.phase == "BLOCK" ? "Block" : "Round"
    return "\(word) \(s.round)/\(s.totalRounds)"
}

private func mmss(_ seconds: Int) -> String {
    let s = max(0, seconds)
    return String(format: "%d:%02d", s / 60, s % 60)
}

// Text(timerInterval:) needs a valid range; never let the end precede "now".
private func countdownRange(_ end: Date) -> ClosedRange<Date> {
    let now = Date()
    return now...max(now, end)
}

private struct Countdown: View {
    let state: LAState
    let font: Font

    var body: some View {
        if state.paused {
            Text(mmss(state.pausedRemaining)).font(font)
        } else {
            Text(timerInterval: countdownRange(state.endTime), countsDown: true).font(font)
        }
    }
}

struct FightClubLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
            // MARK: Lock Screen / banner UI
            LockScreenView(context: context)
                .activityBackgroundTint(Color.black.opacity(0.86))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(phaseLabel(context.state))
                            .font(.caption2.weight(.heavy))
                            .foregroundColor(phaseColor(context.state))
                        Text(context.state.exercise)
                            .font(.headline.weight(.heavy))
                            .foregroundColor(.white)
                            .lineLimit(1)
                    }
                    .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Countdown(state: context.state, font: .title2.weight(.heavy).monospacedDigit())
                        .foregroundColor(phaseColor(context.state))
                        .frame(width: 76)
                        .multilineTextAlignment(.trailing)
                        .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Text(progressLabel(context.state))
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                        if !context.state.nextExercise.isEmpty {
                            Text("Next: \(context.state.nextExercise)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }
                    }
                    .padding(.horizontal, 4)
                }
            } compactLeading: {
                Image(systemName: context.state.paused ? "pause.fill"
                      : (context.state.phase == "REST" ? "pause.circle.fill" : "figure.strengthtraining.traditional"))
                    .foregroundColor(phaseColor(context.state))
            } compactTrailing: {
                Countdown(state: context.state, font: .caption.weight(.heavy).monospacedDigit())
                    .foregroundColor(phaseColor(context.state))
                    .frame(width: 44)
            } minimal: {
                Image(systemName: "timer")
                    .foregroundColor(phaseColor(context.state))
            }
            .keylineTint(phaseColor(context.state))
        }
    }
}

private struct LockScreenView: View {
    let context: ActivityViewContext<WorkoutActivityAttributes>

    var body: some View {
        let s = context.state
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("\(context.attributes.workoutTitle.uppercased()) · \(progressLabel(s).uppercased())")
                    .font(.caption2.weight(.bold))
                    .foregroundColor(.white.opacity(0.6))
                    .lineLimit(1)
                Spacer()
                if !s.paused {
                    (Text("ENDS ") + Text(s.workoutEnd, style: .time))
                        .font(.caption2.weight(.bold))
                        .foregroundColor(.white.opacity(0.6))
                }
            }

            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 1) {
                    Text(phaseLabel(s))
                        .font(.caption2.weight(.heavy))
                        .tracking(1.5)
                        .foregroundColor(phaseColor(s))
                    Text(s.exercise)
                        .font(.title3.weight(.heavy))
                        .foregroundColor(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    if !s.details.isEmpty {
                        Text(s.details)
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.6))
                            .lineLimit(1)
                    }
                }
                Spacer(minLength: 8)
                Countdown(state: s, font: .system(size: 44, weight: .heavy, design: .rounded).monospacedDigit())
                    .foregroundColor(phaseColor(s))
                    .frame(maxWidth: 124, alignment: .trailing)
                    .multilineTextAlignment(.trailing)
            }

            if s.paused {
                Text("Paused — open the app to resume")
                    .font(.caption.weight(.semibold))
                    .foregroundColor(.white.opacity(0.55))
            } else if !s.upcoming.isEmpty {
                Rectangle()
                    .fill(Color.white.opacity(0.14))
                    .frame(height: 0.5)
                // Absolute start times are fixed at Start, so this list stays
                // correct on the lock screen even when the app can't update it.
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(Array(s.upcoming.prefix(2).enumerated()), id: \.offset) { _, item in
                        HStack(spacing: 10) {
                            Text(item.at, format: .dateTime.hour().minute().second())
                                .font(.caption.monospacedDigit())
                                .foregroundColor(.white.opacity(0.45))
                                .frame(width: 78, alignment: .leading)
                            Text(item.label)
                                .font(.caption.weight(.semibold))
                                .foregroundColor(.white.opacity(0.85))
                                .lineLimit(1)
                        }
                    }
                }
            }
        }
        .padding(14)
    }
}
