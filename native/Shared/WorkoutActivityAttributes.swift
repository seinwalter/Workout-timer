import ActivityKit
import Foundation

// Shared between the App target and the FightClubWidget extension target.
// IMPORTANT: In Xcode, set Target Membership for this file to BOTH targets.
struct WorkoutActivityAttributes: ActivityAttributes {
    public struct UpcomingItem: Codable, Hashable {
        var label: String          // "Rest 40s", "Pull-Ups", "Climb · 3.8 mph 8%"
        var at: Date               // absolute start time, fixed when Start is pressed
    }

    public struct ContentState: Codable, Hashable {
        var exercise: String
        var details: String        // rep target / speed + incline / "Next: …" during rest
        var nextExercise: String
        var phase: String          // "WORK", "REST" or "BLOCK" (steady cardio block)
        var round: Int             // round number, or block number for BLOCK
        var totalRounds: Int
        var endTime: Date          // when the current phase ends
        var exerciseIndex: Int     // 1-based
        var totalExercises: Int
        var upcoming: [UpcomingItem]
        var paused: Bool
        var pausedRemaining: Int   // seconds left in the phase while paused
        var workoutEnd: Date
    }

    var workoutTitle: String
}
