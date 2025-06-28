import { App, PluginSettingTab, Setting } from 'obsidian';
import StickyNotesPlugin from '../main';

export class StickyNoteSettingsTab extends PluginSettingTab {
    plugin: StickyNotesPlugin;

    constructor(app: App, plugin: StickyNotesPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Sticky Notes Settings' });

        // Window Settings
        containerEl.createEl('h3', { text: 'Window Settings' });

        new Setting(containerEl)
            .setName('Default Width')
            .setDesc('Default width for new sticky note windows (pixels)')
            .addSlider(slider => slider
                .setLimits(300, 800, 50)
                .setValue(this.plugin.settings.defaultWidth)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.defaultWidth = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Default Height')
            .setDesc('Default height for new sticky note windows (pixels)')
            .addSlider(slider => slider
                .setLimits(300, 1000, 50)
                .setValue(this.plugin.settings.defaultHeight)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.defaultHeight = value;
                    await this.plugin.saveSettings();
                }));

        // File Management Settings
        containerEl.createEl('h3', { text: 'File Management' });

        new Setting(containerEl)
            .setName('Sticky Notes Folder')
            .setDesc('Folder where new sticky notes will be created')
            .addText(text => text
                .setPlaceholder('StickyNotes')
                .setValue(this.plugin.settings.stickyNotesFolder)
                .onChange(async (value) => {
                    this.plugin.settings.stickyNotesFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Auto-naming Prefix')
            .setDesc('Prefix for automatically generated sticky note names')
            .addText(text => text
                .setPlaceholder('Sticky_')
                .setValue(this.plugin.settings.autoNamingPrefix)
                .onChange(async (value) => {
                    this.plugin.settings.autoNamingPrefix = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Include Timestamp')
            .setDesc('Include creation timestamp in new sticky notes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.includeTimestamp)
                .onChange(async (value) => {
                    this.plugin.settings.includeTimestamp = value;
                    await this.plugin.saveSettings();
                }));

        // Behavior Settings
        containerEl.createEl('h3', { text: 'Behavior Settings' });

        new Setting(containerEl)
            .setName('Auto-save Delay')
            .setDesc('Delay in milliseconds before auto-saving changes')
            .addSlider(slider => slider
                .setLimits(500, 5000, 250)
                .setValue(this.plugin.settings.autoSaveDelay)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.autoSaveDelay = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Max Search Results')
            .setDesc('Maximum number of files to show in search results')
            .addSlider(slider => slider
                .setLimits(10, 100, 10)
                .setValue(this.plugin.settings.maxSearchResults)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.maxSearchResults = value;
                    await this.plugin.saveSettings();
                }));

        // Pinning Settings
        containerEl.createEl('h3', { text: 'Window Pinning' });

        new Setting(containerEl)
            .setName('Enable Advanced Pinning')
            .setDesc('Use enhanced pinning features when available')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableAdvancedPinning)
                .onChange(async (value) => {
                    this.plugin.settings.enableAdvancedPinning = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Pin Refresh Interval')
            .setDesc('How often to refresh pinned window focus (milliseconds)')
            .addSlider(slider => slider
                .setLimits(1000, 10000, 500)
                .setValue(this.plugin.settings.pinRefreshInterval)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.pinRefreshInterval = value;
                    await this.plugin.saveSettings();
                }));
    }
}