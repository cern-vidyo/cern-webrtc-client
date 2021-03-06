import Ember from 'ember';

export default Ember.Service.extend({
  currentMeetingKey: null,
  currentPreviewMode: 'PIP',
  isMutedMic: false,
  isMutedVideo: false,
  isMutedSpeaker: false,
  streamCount: 1,
  numPreferredParticipants: 1,
  sessionInfo: null,
  currentShareId: 0,
  guestName: '',

  setCurrentMeetingKey(newMeetingKey){
    this.set('currentMeetingKey', newMeetingKey);
  },

  setSessionInfo(newSessionInfo){
    var self = this;
    Ember.run(function () {
      self.set("sessionInfo", newSessionInfo);
      console.debug("self.get('currentMeetingKey')");
      console.debug(self.get('currentMeetingKey'));
      self.store.find('meeting', self.get('currentMeetingKey')).then(function (currentMeeting) {
        currentMeeting.set('name', newSessionInfo.sessionDisplayText);
        currentMeeting.save();
      });
    });
  },

  setStreamCount(value){
    this.set('streamCount', parseInt(value));
  },

  muteLocalVideo: function (event) {
    if (!(this.get('isDestroyed') || this.get('isDestroying'))) {
      this.set('isMutedVideo', event.isMuted);
    }
  },
  muteLocalMic: function (event) {
    this.set('isMutedMic', event.isMuted);
  },

  muteSpeaker(event){
    this.set('isMutedSpeaker', event.isMuted);
  },
  /**
   * Toggle between preview modes
   * @return {Object} Application object
   */
  clientPreviewModeToggle: function () {
    var previewMode;

    if (this.get('currentPreviewMode').localeCompare("None") === 0) {
      previewMode = "PIP";
    } else if (this.get('currentPreviewMode').localeCompare("PIP") === 0) {
      previewMode = "None";
    }
    this.set('currentPreviewMode', previewMode);
  },

  setNumPreferredParticipantsToggle(){
    if (this.get('numPreferredParticipants') === 1) {
      this.set('numPreferredParticipants', 0);
    } else {
      this.set('numPreferredParticipants', 1);
    }
  },

  setNumPreferredParticipants(value){
    this.set('numPreferredParticipants', value);
  },

  loadCurrentMeeting(meetingKey){
    var self = this;
    self.set('currentMeetingKey', meetingKey);

    console.debug("loadCurrentMeeting");
    var meeting = this.store.find('meeting', meetingKey)
      .then(function (meeting) {
        console.debug("Meeting WAS found");
        self.get('chat-manager').setCurrentActiveChat(meeting.get('mainChat'));
        console.debug(self.get('chat-manager').get("currentActiveChat"));
        console.debug("mainChat is: ");
        console.debug(meeting.get('mainChat'));
        return meeting;
      }, function (error) {
        console.debug("Meeting was NOT found: " + error);
        return self.createNewMeeting(meetingKey);
      });
    console.debug("Returning meeting");
    return meeting;
  },

  createNewMeeting(meetingKey){
    var self = this;
    console.debug("Creating new meeting");
    var meeting = this.store.createRecord('meeting', {
      name: 'Meeting ' + meetingKey,
      id: meetingKey,
      isActive: false
    });
    meeting.save();

    console.debug("Creating new main chat");
    var mainChat = this.store.createRecord('main-chat', {
      name: 'Meeting Chat ' + meeting.id,
      meeting: meeting
    });
    mainChat.save();
    console.debug("Setting up active chat");
    self.get('chat-manager').setCurrentActiveChat(meeting.get('mainChat'));
    console.debug(this.get('chat-manager').get("currentActiveChat"));
    console.debug("mainChat is: ");
    console.debug(meeting.get('mainChat'));

    return meeting;
  },

  saveCurrentGroupChat(meetingKey){
    var self = this;
    this.store.find('meeting', meetingKey).then(function (meeting) {
      if (!meeting.get('groupChat')) {
        //Create the meeting group chat
        var chat = self.store.createRecord('chat', {
          name: 'Meeting Chat',
          isMainChat: true
        });
        chat.set('meeting', meeting);
        meeting.set('groupChat', chat);
      }
    });
  },

  getCurrentUserInfo() {
    this.get('');
  }
});
