#!/usr/bin/env ruby
# Automates the Live Activity Xcode setup:
# - Adds LiveActivityPlugin / MyViewController / WorkoutActivityAttributes to the App target
# - Creates the FightClubWidget extension target with the Live Activity UI
# - Shares WorkoutActivityAttributes.swift between both targets
# - Embeds the widget in the app, sets signing/deployment settings
# - Adds NSSupportsLiveActivities to the app Info.plist
# - Points Main.storyboard at MyViewController
#
# Run via ./setup-live-activity.sh (which installs the xcodeproj gem if needed)

require 'xcodeproj'
require 'fileutils'

REPO = File.expand_path(File.join(__dir__, '..'))
PROJ_PATH = File.join(REPO, 'ios/App/App.xcodeproj')
APP_DIR = File.join(REPO, 'ios/App/App')
WIDGET_DIR = File.join(REPO, 'ios/App/FightClubWidget')
WIDGET_NAME = 'FightClubWidget'

abort "❌ ios project not found at #{PROJ_PATH}. Run: npx cap add ios" unless File.exist?(PROJ_PATH)

project = Xcodeproj::Project.open(PROJ_PATH)
app_target = project.targets.find { |t| t.name == 'App' }
abort '❌ App target not found' unless app_target

# ---------------------------------------------------------------
# 1. Copy source files from native/ into the iOS project tree
# ---------------------------------------------------------------
puts '📋 Copying Swift sources...'
FileUtils.cp(File.join(REPO, 'native/App/LiveActivityPlugin.swift'), APP_DIR)
FileUtils.cp(File.join(REPO, 'native/App/MyViewController.swift'), APP_DIR)
FileUtils.cp(File.join(REPO, 'native/Shared/WorkoutActivityAttributes.swift'), APP_DIR)
FileUtils.mkdir_p(WIDGET_DIR)
FileUtils.cp(File.join(REPO, 'native/Widget/FightClubWidgetBundle.swift'), WIDGET_DIR)
FileUtils.cp(File.join(REPO, 'native/Widget/FightClubLiveActivity.swift'), WIDGET_DIR)
FileUtils.cp(File.join(REPO, 'native/Widget/Info.plist'), WIDGET_DIR)

app_group = project.main_group['App']
abort '❌ App group not found in project' unless app_group

def add_file_once(group, target, path)
  name = File.basename(path)
  ref = group.files.find { |f| f.path == name || f.path&.end_with?("/#{name}") }
  ref ||= group.new_file(path)
  already = target.source_build_phase.files_references.include?(ref)
  target.add_file_references([ref]) unless already
  ref
end

puts '🔗 Adding files to App target...'
add_file_once(app_group, app_target, File.join(APP_DIR, 'LiveActivityPlugin.swift'))
add_file_once(app_group, app_target, File.join(APP_DIR, 'MyViewController.swift'))
shared_ref = add_file_once(app_group, app_target, File.join(APP_DIR, 'WorkoutActivityAttributes.swift'))

# ---------------------------------------------------------------
# 2. Create the widget extension target (skip if it exists)
# ---------------------------------------------------------------
widget_target = project.targets.find { |t| t.name == WIDGET_NAME }
if widget_target
  puts "ℹ️  #{WIDGET_NAME} target already exists — updating sources only."
else
  puts "🧩 Creating #{WIDGET_NAME} extension target..."
  widget_target = project.new_target(:app_extension, WIDGET_NAME, :ios, '16.2')

  widget_group = project.main_group.find_subpath(WIDGET_NAME, true)
  widget_group.set_source_tree('<group>')
  widget_group.set_path(WIDGET_NAME)

  bundle_ref = widget_group.new_file(File.join(WIDGET_DIR, 'FightClubWidgetBundle.swift'))
  activity_ref = widget_group.new_file(File.join(WIDGET_DIR, 'FightClubLiveActivity.swift'))
  widget_group.new_file(File.join(WIDGET_DIR, 'Info.plist'))
  widget_target.add_file_references([bundle_ref, activity_ref, shared_ref])

  # Resolve app bundle id + team for signing
  app_settings = app_target.build_configurations.first.build_settings
  app_bundle_id = app_settings['PRODUCT_BUNDLE_IDENTIFIER'] || 'com.fightclub.workout'
  team = app_settings['DEVELOPMENT_TEAM']
  team ||= (project.root_object.attributes.dig('TargetAttributes', app_target.uuid, 'DevelopmentTeam') rescue nil)

  widget_target.build_configurations.each do |config|
    bs = config.build_settings
    bs['GENERATE_INFOPLIST_FILE'] = 'YES'
    bs['INFOPLIST_FILE'] = "#{WIDGET_NAME}/Info.plist"
    bs['INFOPLIST_KEY_CFBundleDisplayName'] = 'Fight Club'
    bs['PRODUCT_BUNDLE_IDENTIFIER'] = "#{app_bundle_id}.#{WIDGET_NAME}"
    bs['PRODUCT_NAME'] = '$(TARGET_NAME)'
    bs['SWIFT_VERSION'] = '5.0'
    bs['IPHONEOS_DEPLOYMENT_TARGET'] = '16.2'
    bs['TARGETED_DEVICE_FAMILY'] = '1,2'
    bs['CODE_SIGN_STYLE'] = 'Automatic'
    bs['DEVELOPMENT_TEAM'] = team if team && !team.empty?
    bs['CURRENT_PROJECT_VERSION'] = '1'
    bs['MARKETING_VERSION'] = '1.0'
    bs['SKIP_INSTALL'] = 'YES'
    bs['LD_RUNPATH_SEARCH_PATHS'] = '$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks'
  end

  # Embed the extension inside the app bundle
  embed_phase = app_target.copy_files_build_phases.find { |p| p.name == 'Embed App Extensions' }
  embed_phase ||= app_target.new_copy_files_build_phase('Embed App Extensions')
  embed_phase.symbol_dst_subfolder_spec = :plug_ins
  unless embed_phase.files_references.include?(widget_target.product_reference)
    build_file = embed_phase.add_file_reference(widget_target.product_reference)
    build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
  end
  app_target.add_dependency(widget_target)
end

project.save
puts '💾 Project saved.'

# ---------------------------------------------------------------
# 3. NSSupportsLiveActivities in the app Info.plist
# ---------------------------------------------------------------
info_plist = File.join(APP_DIR, 'Info.plist')
unless system("/usr/libexec/PlistBuddy -c 'Print :NSSupportsLiveActivities' '#{info_plist}' >/dev/null 2>&1")
  system("/usr/libexec/PlistBuddy -c 'Add :NSSupportsLiveActivities bool true' '#{info_plist}'")
  puts '✅ NSSupportsLiveActivities added to Info.plist'
end

# ---------------------------------------------------------------
# 4. Point Main.storyboard at MyViewController
# ---------------------------------------------------------------
storyboard = File.join(APP_DIR, 'Base.lproj/Main.storyboard')
if File.exist?(storyboard)
  xml = File.read(storyboard)
  if xml.include?('customClass="CAPBridgeViewController"')
    xml.sub!('customClass="CAPBridgeViewController" customModule="Capacitor"',
             'customClass="MyViewController" customModule="App" customModuleProvider="target"')
    # Fallback if attribute order differs
    xml.sub!('customClass="CAPBridgeViewController"', 'customClass="MyViewController" customModuleProvider="target"') if xml.include?('customClass="CAPBridgeViewController"')
    File.write(storyboard, xml)
    puts '✅ Storyboard now uses MyViewController'
  else
    puts 'ℹ️  Storyboard already customized'
  end
end

puts ''
puts '🎉 Live Activity setup complete!'
puts 'Next: npx cap open ios  →  select your iPhone  →  Cmd+R'
