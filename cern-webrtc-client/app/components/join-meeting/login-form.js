import Ember from 'ember';
import TrackedComponent from '../tracked-component';
import config from '../../config/environment';

export default TrackedComponent.extend({
  session: Ember.inject.service('session'),
  usernameGenerator: Ember.inject.service('username-generator'),
  client: Ember.computed.alias('client-manager.client'),
  microphones: Ember.computed.alias('configuration-manager.microphones'),
  connectionFault: Ember.computed.alias('connection-manager.connectionFault'),
  serverAvailable: Ember.computed.alias('connection-manager.serverAvailable'),
  logEnabled: Ember.computed.alias('logger.logEnabled'),
  roomKey: '',
  roomURLInputInvalidFeedback: '',
  roomURLInputClass: '',
  roomPinInputInvalidFeedback: '',
  modalConfigurationIsOpen: false,
  maximumGuestNameLength: 40,
  baseVidyoPortalUrl: config.vidyo_portal_url,
  portalUrl: Ember.computed('baseVidyoPortalUrl', function(){
    return this.get('baseVidyoPortalUrl') + '/join/';
    //https://vidyoportal.cern.ch/join/hsjT7YiPtmp7
  }),
  vidyoCafeUrl: Ember.computed('portalUrl', function(){
    return this.get('portalUrl') + 'hsjT7YiPtmp7';
  }),

  isDevelopmentEnvironment: config.environment === 'development' || config.environment === 'qa',

  roomUrl: Ember.computed('key', 'portalUrl', function () {
    if (this.get('key')) {
      return this.get('portalUrl') + this.get('key');
    } else {
      return "";
    }
  }),
  guestName: Ember.computed('session.data.authenticated.user_info.displayName', function () {
    return this.get('session.data.authenticated.user_info.displayName');
  }),
  roomPin: Ember.computed('pin', function () {
    return this.get('pin');
  }),

  /**
   * Initializes the login form with validation
   */
  didInsertElement(){
    var self = this;

    Ember.$.fn.form.settings.rules.validateKey = function(param) {
      return (param.toLowerCase().indexOf("key=") >= 0 || param.toLowerCase().indexOf("/join/") >= 0);
    };

    Ember.$('#login-form').form({
      on: 'change',
      inline: true,
      fields: {
        roomUrl: {
          identifier: 'roomUrl',
          rules: [
            {
              type   : 'validateKey[param]',
              prompt : 'Room key not found on the room URL'
            },
            {
              type: 'empty',
              prompt: 'Please enter a Vidyoportal URL'
            },
            {
              type: 'url'
            },
            // {
            //   type: 'contains[/join/]'
            // },
            {
              type: 'contains['+self.get('baseVidyoPortalUrl')+']',
              prompt: 'Please enter a valid Vidyoportal URL'
            }
          ]
        },
        guestName: {
          identifier: 'guestName',
          rules: [
            {
              type: 'empty',
              prompt: 'Please enter a username'
            },
            {
              type: 'maxLength['+self.get("maximumGuestNameLength")+']',
              prompt: 'Username should be shorter than '+self.get("maximumGuestNameLength")+' characters'
            }
          ]
        },
        onSuccess: self.validationPassed()
      }
    });

  },
  validationPassed(){
  },
  /**
   * Checks if the room key is empty
   * @returns {boolean}
   */
  isRoomKeyMissing() {
    return (this.getRoomKey() === '');
  },

  isGuestNameMissing() {
    return Ember.$.trim(this.get('guestName')) === '';
  },

  isRoomKeyFromURLMissing() {
    return this.get('key') === '';
  },

  isRoomKeyFromInputMissing() {
    let roomKey = this.get('roomUrl').substr(this.get('roomUrl').lastIndexOf('/') + 1);
    if(roomKey.length === 0){
      roomKey = this.getParameterByName('key', this.get('roomUrl'));
    }

    return roomKey.length === 0;
  },

  /**
   * Will get the value of the query param by name
   * @param name Name of the query param.
   * @returns {*} Value of the query param.
   */
  getParameterByName(name, src) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name.toLowerCase() + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(src);
    if (results == null) {
      return "";
    }
    else {
      return decodeURIComponent(results[1].replace(/\+/g, " "));
    }
  },

  isGuestNameTooLong(){
    return this.get('guestName').length > this.get("maximumGuestNameLength");
  },

  /**
   * Extracts the room key from the roomUrl or from the query
   * @returns {*}
   */
  getRoomKey() {
    if (!this.isRoomKeyFromInputMissing()) {


      let roomKey = this.getParameterByName('key', this.get('roomUrl'));


      if(roomKey.length === 0){
        roomKey = this.get('roomUrl').substr(this.get('roomUrl').lastIndexOf('/') + 1);
      }

      return roomKey;

    } else if (!this.isRoomKeyFromURLMissing()) {
      return this.get('key');
    }
    return '';
  },

  /**
   * Generates the login parameters from the from attributes
   * @returns {{fullUri: string, portalUri, roomKey: *, guestName, pin}}
   */
  getInEventLoginParams() {
    return {
      fullUri: this.get('portalUrl') + '/join/' + this.getRoomKey(),
      portalUri: this.get('baseVidyoPortalUrl'),
      roomKey: this.getRoomKey(),
      guestName: this.get('guestName'),
      pin: this.get('roomPin')
    };
  },

  actions: {
    /**
     * Displays the configuration modal to set devices and notifications
     */
    displayConfigurationModal(){
      console.debug("Display configuration modal");
      Ember.$('.modal-configuration').modal("show");
    },

    /**
     * Displays the feedback modal to send feedback
     */
    displayFeedbackModal(){
      console.debug("Display feedback modal");
      Ember.$('.modal-feedback').modal("show");
    },

    /**
     * Sets the URL of the Vidyo Cafe on the room field
     */
    setVidyoCafeRoomUrl: function () {
      this.set('roomUrl', this.get('vidyoCafeUrl'));
      this._trackEvent('login-form', 'setVidyoCafeRoomUrl');
    },

    /**
     * Only for development: Sets a random polish or spanish name in the guestName field
     */
    setRandomGuestName: function () {
      let randomName = this.get('usernameGenerator').generateRandomUsername();
      this.set('guestName', randomName);
      this._trackEvent('login-form', 'setRandomGuestName');
    },

    /**
     * Connects to a meeting with the form data
     */
    connectAsGuest(){
      let self = this;
      this._trackEvent('login-form', 'connectAsGuest');

      if (this.isRoomKeyFromInputMissing() || this.isGuestNameMissing() || this.isGuestNameTooLong()) {
        return;
      }

      var inEvent = vidyoClientPrivateMessages.privateInEventVcsoapGuestLink(this.getInEventLoginParams());
      inEvent.typeRequest = "GuestLink";

      this.get('connection-manager').setAllParametersToDefault(true);
      this.get('connection-manager').setCurrentUserAsGuest(true);

      if (!this.get('client').sendEvent(inEvent)) {
        this.sendAction('unableToJoin');
        this.get('connection-manager').setConnectionFault({fault: "UnableToSendGuestLinkEvent"});
      } else {
        var meetingKey = this.getRoomKey();

        this.get('meeting-manager').loadCurrentMeeting(meetingKey).then(function (meeting) {
          self.get('connection-manager').setIsJoining(true);
          self.get('meeting-manager').set('guestName', self.get('guestName'));
          console.debug("currentActiveChat loading-box");
          console.debug(self.get('chat-manager').get("currentActiveChat"));
          self.sendAction('redirectToMeeting', meeting);
        });
      }
    }
  }
});

