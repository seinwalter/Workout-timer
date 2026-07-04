import ActivityKit
import WidgetKit
import SwiftUI

struct FightClubLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
            // MARK: Lock Screen / banner UI
            LockScreenView(context: context)
                .activityBackgroundTint(Color.black.opacity(0.85))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                // MARK: Expanded Dynamic Island
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(phaseLabel(context.state.phase))
                            .font(.caption2.weight(.heavy))
                            .foregroundColor(phaseColor(context.state.phase))
                        Text(context.state.exercise)
                            .font(.headline.weight(.bold))
                            .foregroundColor(.white)
                            .lineLimit(1)
                    }
                    .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(timerInterval: Date.now...context.state.endTime, countsDown: true)
                        .font(.title2.weight(.semibold).monospacedDigit())
                        .foregroundColor(phaseColor(context.state.phase))
                        .frame(width: 70)
                        .multilineTextAlignment(.trailing)
                        .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Text("Round \(context.state.round)/\(context.state.totalRounds)")
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
                Image(systemName: context.state.phase == "WORK" ? "figure.strengthtraining.traditional" : "pause.circle.fill")
                    .foregroundColor(phaseColor(context.state.phase))
            } compactTrailing: {
                Text(timerInterval: Date.now...context.state.endTime, countsDown: true)
                    .font(.caption.weight(.semibold).monospacedDigit())
                    .foregroundColor(phaseColor(context.state.phase))
                    .frame(width: 44)
            } minimal: {
                Image(systemName: "timer")
                    .foregroundColor(phaseColor(context.state.phase))
            }
            .keylineTint(phaseColor(context.state.phase))
        }
    }
}

private func phaseColor(_ phase: String) -> Color {
    phase == "WORK" ? Color(red: 1.0, green: 0.23, blue: 0.19) : Color(red: 0.2, green: 0.78, blue: 0.35)
}

private func phaseLabel(_ phase: String) -> String {
    phase == "WORK" ? "WORK" : "REST"
}

private struct LockScreenView: View {
    let context: ActivityViewContext<WorkoutActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("🥊 \(context.attributes.workoutTitle)")
                    .font(.caption.weight(.bold))
                    .foregroundColor(.white.opacity(0.7))
                Spacer()
                Text("Round \(context.state.round)/\(context.state.totalRounds)")
                    .font(.caption2.weight(.semibold))
                    .foregroundColor(.white.opacity(0.5))
            }

            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(phaseLabel(context.state.phase))
                        .font(.caption2.weight(.heavy))
                        .tracking(1.5)
                        .foregroundColor(phaseColor(context.state.phase))
                    Text(context.state.exercise)
                        .font(.title3.weight(.bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    if !context.state.nextExercise.isEmpty {
                        Text("Next: \(context.state.nextExercise)")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.5))
                            .lineLimit(1)
                    }
                }
                Spacer()
                Text(timerInterval: Date.now...context.state.endTime, countsDown: true)
                    .font(.system(size: 40, weight: .light).monospacedDigit())
                    .foregroundColor(phaseColor(context.state.phase))
                    .frame(maxWidth: 110)
                    .multilineTextAlignment(.trailing)
            }

            ProgressView(value: Double(context.state.exerciseIndex), total: Double(max(context.state.totalExercises, 1)))
                .tint(phaseColor(context.state.phase))
                .scaleEffect(y: 0.6)
        }
        .padding(14)
    }
}
