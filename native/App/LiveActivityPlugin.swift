import Foundation
import UIKit
import Capacitor
#if canImport(ActivityKit)
import ActivityKit
#endif

// Custom Capacitor plugin exposing ActivityKit Live Activities to JavaScript.
// Also hosts setKeepAwake so the screen stays on during a workout without
// pulling in another npm plugin. Registered manually in MyViewController.swift.
@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveActivityPlugin"
    public let jsName = "LiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setKeepAwake", returnType: CAPPluginReturnPromise)
    ]

    @objc func setKeepAwake(_ call: CAPPluginCall) {
        let enabled = call.getBool("enabled") ?? false
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = enabled
            call.resolve()
        }
    }

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

    private static func date(fromMs ms: Double?) -> Date {
        guard let ms = ms else { return Date() }
        return Date(timeIntervalSince1970: ms / 1000)
    }

    @available(iOS 16.2, *)
    private static func contentState(from call: CAPPluginCall) -> WorkoutActivityAttributes.ContentState {
        let rawUpcoming = call.getArray("upcoming") ?? []
        let upcoming: [WorkoutActivityAttributes.UpcomingItem] = rawUpcoming.compactMap { item in
            guard let obj = item as? JSObject,
                  let label = obj["label"] as? String,
                  let atMs = (obj["at"] as? NSNumber)?.doubleValue else { return nil }
            return WorkoutActivityAttributes.UpcomingItem(label: label, at: date(fromMs: atMs))
        }

        return WorkoutActivityAttributes.ContentState(
            exercise: call.getString("exercise") ?? "",
            details: call.getString("details") ?? "",
            nextExercise: call.getString("nextExercise") ?? "",
            phase: call.getString("phase") ?? "WORK",
            round: call.getInt("round") ?? 1,
            totalRounds: call.getInt("totalRounds") ?? 1,
            endTime: date(fromMs: call.getDouble("endTime")),
            exerciseIndex: call.getInt("exerciseIndex") ?? 1,
            totalExercises: call.getInt("totalExercises") ?? 1,
            upcoming: Array(upcoming.prefix(4)),
            paused: call.getBool("paused") ?? false,
            pausedRemaining: call.getInt("pausedRemaining") ?? 0,
            workoutEnd: date(fromMs: call.getDouble("workoutEnd"))
        )
    }
}
