loadAPI(1);

host.defineController("CME", "UF5", "1.0", "E7A60AD5-9F03-42EB-AD75-3154F3C9FD8D");
host.defineMidiPorts(1, 0);

var LOWEST_CC = 2;
var HIGHEST_CC = 190;

var DEVICE_START_CC = 14;
var DEVICE_END_CC = 31;

var FADER_COUNT = 8;
var ROTARY_COUNT = 8;

var CC_START_TRACK_VOL = 176;

var MIDI_CHANNEL_COUNT = 16;
var PROGRAMM_CHANGER = 192;

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
    primaryDevice,
    userControls;

var midiChannels = initArray(null, MIDI_CHANNEL_COUNT + 1);


function EndlessScroller(max, nextCallback, prevCallback) {
    var lastValue = null;
    var maxValue = max;

    return function(value) {
        if(lastValue==maxValue && value == 0) {
            lastValue = value;
            nextCallback();
            return;
        }
        if(lastValue == 0 && value == maxValue) {
            lastValue = value;
            prevCallback();
            return;
        }

        if(value > lastValue) {
            lastValue = value;
            nextCallback();
            return;
        }
        if(value < lastValue) {
            lastValue = value;
            prevCallback();
        }
    }
}

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

    primaryDevice = cursorTrack.getPrimaryDevice();
    println(primaryDevice.getCommonParameter(0));
    println(primaryDevice.getCommonParameter(1));
    println(primaryDevice.getCommonParameter(2));
    println(primaryDevice.getCommonParameter(3));
    println(primaryDevice.getCommonParameter(4));
    println(primaryDevice.getEnvelopeParameter(0).addValueDisplayObserver(8, "", function(val){
        println('env 0'+val);
    }));
}

function exit() {
}


var tempoCounter = 0;

var trackSelector = EndlessScroller(127, function(){
    cursorTrack.selectNext();
}, function() {
    cursorTrack.selectPrevious();
})

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
    if(status == PROGRAMM_CHANGER) {
        trackSelector(data1);
        return;
    }
    if (isChannelController(status)) {
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
