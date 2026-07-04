import Foundation
import Capacitor
#if canImport(ActivityKit)
import ActivityKit
#endif

// Custom Capacitor plugin exposing ActivityKit Live Activities to JavaScript.
// Registered manually in MyViewController.swift (see LIVE_ACTIVITY_SETUP.md).
@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveActivityPlugin"
    public let jsName = "LiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise)
    ]

    @objc func start(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2+")
            return
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.reject("Live Activities are disabled for this app")
            return
        }

        let attributes = WorkoutActivityAttributes(
            workoutTitle: call.getString("workoutTitle") ?? "Workout"
        )
        let state = Self.contentState(from: call)

        Task {
            // Only one workout activity at a time
            await Self.endAllActivities()
            do {
                _ = try Activity.request(
                    attributes: attributes,
                    content: .init(state: state, staleDate: nil)
                )
                call.resolve()
            } catch {
                call.reject("Failed to start Live Activity: \(error.localizedDescription)")
            }
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2+")
            return
        }
        let state = Self.contentState(from: call)
        Task {
            for activity in Activity<WorkoutActivityAttributes>.activities {
                await activity.update(.init(state: state, staleDate: nil))
            }
            call.resolve()
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        Task {
            await Self.endAllActivities()
            call.resolve()
        }
    }

    @available(iOS 16.2, *)
    private static func endAllActivities() async {
        for activity in Activity<WorkoutActivityAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }

    @available(iOS 16.2, *)
    private static func contentState(from call: CAPPluginCall) -> WorkoutActivityAttributes.ContentState {
        let endTimeMs = call.getDouble("endTime") ?? Date().timeIntervalSince1970 * 1000
        return WorkoutActivityAttributes.ContentState(
            exercise: call.getString("exercise") ?? "",
            nextExercise: call.getString("nextExercise") ?? "",
            phase: call.getString("phase") ?? "WORK",
            round: call.getInt("round") ?? 1,
            totalRounds: call.getInt("totalRounds") ?? 1,
            endTime: Date(timeIntervalSince1970: endTimeMs / 1000),
            exerciseIndex: call.getInt("exerciseIndex") ?? 1,
            totalExercises: call.getInt("totalExercises") ?? 1
        )
    }
}
