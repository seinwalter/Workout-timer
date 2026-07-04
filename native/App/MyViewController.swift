import UIKit
import Capacitor

// Custom bridge view controller that registers our local LiveActivity plugin.
// See LIVE_ACTIVITY_SETUP.md: Main.storyboard's view controller custom class
// must be changed from CAPBridgeViewController to MyViewController.
class MyViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(LiveActivityPlugin())
    }
}
