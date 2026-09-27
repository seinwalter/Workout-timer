import Foundation
import Capacitor
import HealthKit

// Apple Health bridge for the web app (jsName "Health").
//  - saveWorkout: writes an HKWorkout (+ active energy) via HKWorkoutBuilder,
//    which works on iOS 16 (HKWorkoutSession on iPhone needs iOS 17).
//  - readBodyMass: returns recent body-weight samples in pounds.
// Registered in MyViewController.swift. Needs the HealthKit entitlement and the
// NSHealth*UsageDescription keys (setup-live-activity.sh adds both).
@objc(HealthKitPlugin)
public class HealthKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthKitPlugin"
    public let jsName = "Health"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveWorkout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readBodyMass", returnType: CAPPluginReturnPromise)
    ]

    private let store = HKHealthStore()

    private var energyType: HKQuantityType { HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)! }
    private var bodyMassType: HKQuantityType { HKQuantityType.quantityType(forIdentifier: .bodyMass)! }

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Health data is not available on this device")
            return
        }
        // Asking without the usage strings crashes the app, so check first
        guard Bundle.main.object(forInfoDictionaryKey: "NSHealthUpdateUsageDescription") != nil,
              Bundle.main.object(forInfoDictionaryKey: "NSHealthShareUsageDescription") != nil else {
            call.reject("Info.plist is missing the Health usage text — run ./setup-live-activity.sh")
            return
        }
        let share: Set<HKSampleType> = [HKObjectType.workoutType(), energyType]
        let read: Set<HKObjectType> = [bodyMassType, HKObjectType.workoutType()]
        store.requestAuthorization(toShare: share, read: read) { success, error in
            if let error = error {
                call.reject(error.localizedDescription)
            } else {
                call.resolve(["granted": success])
            }
        }
    }

    @objc func saveWorkout(_ call: CAPPluginCall) {
        guard let startMs = call.getDouble("start"), let endMs = call.getDouble("end"), endMs > startMs else {
            call.reject("start and end are required")
            return
        }
        let start = Date(timeIntervalSince1970: startMs / 1000)
        let end = Date(timeIntervalSince1970: endMs / 1000)
        let kcal = call.getDouble("kcal") ?? 0

        let config = HKWorkoutConfiguration()
        switch call.getString("activity") ?? "strength" {
        case "walking":
            config.activityType = .walking
        case "hiit":
            config.activityType = .highIntensityIntervalTraining
        default:
            config.activityType = .functionalStrengthTraining
        }
        config.locationType = .indoor

        let builder = HKWorkoutBuilder(healthStore: store, configuration: config, device: .local())
        builder.beginCollection(withStart: start) { began, error in
            guard began else {
                call.reject(error?.localizedDescription ?? "Could not start the workout")
                return
            }

            let finish = {
                builder.endCollection(withEnd: end) { ended, error in
                    guard ended else {
                        call.reject(error?.localizedDescription ?? "Could not end the workout")
                        return
                    }
                    builder.finishWorkout { workout, error in
                        if let error = error {
                            call.reject(error.localizedDescription)
                        } else {
                            call.resolve(["saved": workout != nil])
                        }
                    }
                }
            }

            if kcal > 0 {
                let quantity = HKQuantity(unit: .kilocalorie(), doubleValue: kcal)
                let sample = HKQuantitySample(type: self.energyType, quantity: quantity, start: start, end: end)
                builder.add([sample]) { _, _ in finish() }
            } else {
                finish()
            }
        }
    }

    @objc func readBodyMass(_ call: CAPPluginCall) {
        let days = Double(call.getInt("days") ?? 120)
        let since = Date().addingTimeInterval(-days * 86400)
        let predicate = HKQuery.predicateForSamples(withStart: since, end: Date(), options: [])
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
        let query = HKSampleQuery(sampleType: bodyMassType, predicate: predicate, limit: 500, sortDescriptors: [sort]) { _, results, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            let samples: [[String: Any]] = (results as? [HKQuantitySample] ?? []).map { s in
                [
                    "t": s.startDate.timeIntervalSince1970 * 1000,
                    "lb": s.quantity.doubleValue(for: .pound())
                ]
            }
            call.resolve(["samples": samples])
        }
        store.execute(query)
    }
}
