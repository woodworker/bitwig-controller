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

var CC_MAP_VOLUME = {
    TRACK1 : 176,
    TRACK2 : 177,
    TRACK3 : 178,
    TRACK4 : 179,
    TRACK5 : 180,
    TRACK6 : 181,
    TRACK7 : 182,
    TRACK8 : 183,
    TRACK9 : 184,
    TRACK10: 185,
    TRACK11: 186,
    TRACK12: 187,
    TRACK13: 188,
    TRACK14: 189,
    TRACK15: 190,
    TRACK16: 191,
}

var SEQ_MAP = {
    GO : 242,
    STOP : 252,
    PLAY : 250,
    ARM :   'f07f000606f7',
    UNARM : 'f07f000607f7'
};

function init()
{
    host.getMidiInPort(0).setMidiCallback(onMidi);
    host.getMidiInPort(0).setSysexCallback(onSysex);

    transport = host.createTransport();
    cursorTrack = host.createCursorTrack(2, 0);
    masterTrack = host.createMasterTrack(0);

    // host.getMidiInPort(0).createNoteInput("CME UF5");
    for (var i = 0; i < 16; i++) {
        var hex = uint8ToHex(i),
            channelcode = hex.substr(1).toUpperCase();

        var noteInput = host.getMidiInPort(0).createNoteInput("CME UF5 - Ch" + (i + 1), "?" + channelcode + "????");
        noteInput.setShouldConsumeEvents(false);
    }

    application = host.createApplication();

    trackBank = host.createMainTrackBank(8, 2, 0);
    cursorTrack = host.createCursorTrackSection(2, 0);
    cursorDevice = host.createCursorDeviceSection(8);

    primaryInstrument = cursorTrack.getPrimaryInstrument();

    // Make CCs 2-119 freely mappable
    userControls = host.createUserControlsSection(HIGHEST_CC - LOWEST_CC + 1);
    for ( var i = LOWEST_CC; i < HIGHEST_CC; i++)
    {
        if (!isInDeviceParametersRange(i))
        {
            var index = userIndexFromCC(i);
            userControls.getControl(index).setLabel("CC" + i);
        }
    }
}

function exit()
{
}

function isInDeviceParametersRange(cc)
{
    return cc >= DEVICE_START_CC && cc <= DEVICE_END_CC;
}

function userIndexFromCC(cc)
{
    if (cc > DEVICE_END_CC)
    {
        return cc - LOWEST_CC - 8;
    }

    return cc - LOWEST_CC;
}

function onMidi(status, data1, data2)
{

    if(status!=248 && status!=254){
        println("Status: " + status + ", D1: " + data1 + ", D2: " + data2 + ", Ch: " + MIDIChannel(status));
    }
    if (isChannelController(status))
    {
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
println(status);
        switch (status) {
            case CC_MAP_VOLUME.TRACK1:
            case CC_MAP_VOLUME.TRACK2:
            case CC_MAP_VOLUME.TRACK3:
            case CC_MAP_VOLUME.TRACK4:
            case CC_MAP_VOLUME.TRACK5:
            case CC_MAP_VOLUME.TRACK6:
            case CC_MAP_VOLUME.TRACK7:
            case CC_MAP_VOLUME.TRACK8:
            case CC_MAP_VOLUME.TRACK9:
            case CC_MAP_VOLUME.TRACK10:
            case CC_MAP_VOLUME.TRACK11:
            case CC_MAP_VOLUME.TRACK12:
            case CC_MAP_VOLUME.TRACK13:
            case CC_MAP_VOLUME.TRACK14:
            case CC_MAP_VOLUME.TRACK15:
            case CC_MAP_VOLUME.TRACK16:
                var index = status - CC_START_TRACK_VOL;
                var track = trackBank.getTrack(index);
                if (track && track != masterTrack) {
                    println('VOL for track: '+index);
                    track.getVolume().set(data2, 128);
                }
                break;
        }

    }
    switch(status) {
        case SEQ_MAP.PLAY:
            transport.play();
            println('PLAY');
            break;
        case SEQ_MAP.STOP:
            transport.stop();
            println('STOP');
            break;
    }
}

function onSysex(data) {
    println("Sysex: "+data);

    if (data.matchesHexPattern("f0 7f 7f 04 01 7f ?? f7")) {
        var value = data.hexByteAt(6);
        println("VOL: " + value);
        masterTrack.getVolume().set(value, 128);
    }

    switch(data){
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
