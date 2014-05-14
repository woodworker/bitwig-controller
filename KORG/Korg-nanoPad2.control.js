loadAPI(1);

host.defineController("Korg", "nanoPAD2", "1.0", "1DEA90A7-B0FF-47A8-B285-40B17941F0B3");
host.defineMidiPorts(1, 1);
host.addDeviceNameBasedDiscoveryPair(["nanoPAD2"], ["nanoPAD2"]);

var MIDI_CHANNEL_COUNT = 1;
var midiChannels = initArray(null, MIDI_CHANNEL_COUNT + 1);

function init() {
    host.getMidiInPort(0).setMidiCallback(onMidi);
    host.getMidiInPort(0).setSysexCallback(onSysex);

    midiChannels[0] = host.getMidiInPort(0).createNoteInput("nanoPAD2");
    midiChannels[0].setShouldConsumeEvents(false);
}

function exit() {
}

function onMidi(status, data1, data2) {
    printMidi(status, data1, data2);
}

function onSysex(data) {
    printSysex(data);
}