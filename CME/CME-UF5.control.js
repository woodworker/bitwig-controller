loadAPI(1);

host.defineController("CME", "UF5", "1.0", "E7A60AD5-9F03-42EB-AD75-3154F3C9FD8D");
host.defineMidiPorts(1, 0);

var LOWEST_CC = 2;
var HIGHEST_CC = 190;

var DEVICE_START_CC = 20;
var DEVICE_END_CC = 27;

var FADER_COUNT = 8;
var ROTARY_COUNT = 8;

var CC_START_TRACK_VOL = 176;

var MIDI_CHANNEL_COUNT = 16;

var SEQ_MAP = {
    GO: 242,
    STOP: 252,
    PLAY: 250,
    ARM: 'f07f000606f7',
    UNARM: 'f07f000607f7'
};

var VOLUME_DATA_KEY = 7;
var POSITION_CC_KEY = 242;

var transport,
    cursorTrack,
    masterTrack,
    application,
    trackBank,
    cursorDevice,
    primaryInstrument,
    userControls;

var midiChannels = initArray(null, MIDI_CHANNEL_COUNT + 1);

function init() {
    host.getMidiInPort(0).setMidiCallback(onMidi);
    host.getMidiInPort(0).setSysexCallback(onSysex);

    transport = host.createTransport();
    cursorTrack = host.createCursorTrack(2, 0);
    masterTrack = host.createMasterTrack(0);

    midiChannels[0] = host.getMidiInPort(0).createNoteInput("CME UF5");
    midiChannels[0].setShouldConsumeEvents(false);

    for (var i = 0; i < 16; i++) {
        var hex = uint8ToHex(i),
            channelcode = hex.substr(1, 1).toUpperCase(),
            channelNumber = i + 1;

        midiChannels[channelNumber] = host.getMidiInPort(0).createNoteInput("CME UF5 - Ch" + channelNumber, "?" + channelcode + "????");
        midiChannels[channelNumber].setShouldConsumeEvents(false);
    }

    application = host.createApplication();

    trackBank = host.createMainTrackBank(8, 2, 0);
    cursorTrack = host.createCursorTrackSection(2, 0);
    cursorDevice = host.createCursorDeviceSection(8);

    primaryInstrument = cursorTrack.getPrimaryInstrument();

    // Make CCs 2-119 freely mappable
    userControls = host.createUserControlsSection(HIGHEST_CC - LOWEST_CC + 1);
    for (var i = LOWEST_CC; i < HIGHEST_CC; i++) {
        if (!isInDeviceParametersRange(i)) {
            var index = userIndexFromCC(i);
            userControls.getControl(index).setLabel("CC" + i);
        }
    }
}

function exit() {
}

function isInDeviceParametersRange(cc) {
    return cc >= DEVICE_START_CC && cc <= DEVICE_END_CC;
}

function userIndexFromCC(cc) {
    if (cc > DEVICE_END_CC) {
        return cc - LOWEST_CC - 8;
    }

    return cc - LOWEST_CC;
}

var tempoCounter = 0;

function onMidi(status, data1, data2) {
    var channel = MIDIChannel(status);
    if (isNoteOn(status) || isNoteOff(status, data2)) {
        return;
    }
    if (status == 248) { // MIDI Clock
        tempoCounter++;
        return;
    }
    if (status == 254) { // MIDI Active Sensing
        return;
    }
    if (status == POSITION_CC_KEY) {
        var position = (data1 + (data2 * 128)) / 16;
        transport.getPosition().setRaw(position);
        return;
    }
    if (isChannelController(status)) {
//        if (isInDeviceParametersRange(data1))
//        {
//            var index = data1 - DEVICE_START_CC;
//            primaryInstrument.getMacro(index).getAmount().set(data2, 128);
//        }
//        else if (data1 >= LOWEST_CC && data1 <= HIGHEST_CC)
//        {
//            var index = data1 - LOWEST_CC;
//            userControls.getControl(index).set(data2, 128);
//        }
        switch (data1) {
            case VOLUME_DATA_KEY:
                var track = trackBank.getTrack(channel);
                if (track) {
                    track.getVolume().set(data2, 128);
                }
                return;
        }
    }
    switch (status) {
        case SEQ_MAP.PLAY:
            transport.play();
            return;
        case SEQ_MAP.STOP:
            transport.stop();
            return;
    }

    println("Status: " + status + ", D1: " + data1 + ", D2: " + data2 + ", Ch: " + channel);
}

function onSysex(data) {
    println("Sysex: " + data);

    if (data.matchesHexPattern("f0 7f 7f 04 01 7f ?? f7")) {
        var value = data.hexByteAt(6);
        masterTrack.getVolume().set(value, 128);
    }

    switch (data) {
        case SEQ_MAP.ARM:
            cursorTrack.getArm().set(true);
            println('ARM');
            break;
        case SEQ_MAP.UNARM:
            cursorTrack.getArm().set(false);
            println('UNARM');
            break;
    }
}
