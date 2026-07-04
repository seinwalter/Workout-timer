import ActivityKit
import Foundation

// Shared between the App target and the FightClubWidget extension target.
// IMPORTANT: In Xcode, set Target Membership for this file to BOTH targets.
struct WorkoutActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var exercise: String
        var nextExercise: String
        var phase: String          // "WORK" or "REST"
        var round: Int
        var totalRounds: Int
        var endTime: Date          // when the current phase ends
        var exerciseIndex: Int     // 1-based
        var totalExercises: Int
    }

    var workoutTitle: String
}
