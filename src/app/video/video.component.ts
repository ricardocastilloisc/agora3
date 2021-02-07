import { AfterViewInit, Component, OnInit } from '@angular/core';
declare var AgoraRTC: any;
declare var $: any;

@Component({
  selector: 'app-video',
  templateUrl: './video.component.html',
  styleUrls: ['./video.component.css'],
})
export class VideoComponent implements OnInit, AfterViewInit {
  rtc = {
    client: AgoraRTC.createClient({
      mode: 'rtc',
      codec: 'h264',
    }),
    joined: false,
    published: false,
    localStream: null,
    remoteStreams: [],
    params: {
      uid: '',
    },
  };

  cameraId: string | undefined;

  constructor() {
    console.log(
      'agora sdk version: ' +
        AgoraRTC.VERSION +
        ' compatible: ' +
        AgoraRTC.checkSystemRequirements()
    );
  }
  ngAfterViewInit(): void {
    this.getdevices();
  }

  async getdevices() {
    new Promise<void>((resolve, reject) => {
      if (AgoraRTC.checkSystemRequirements()) {
        $('#compatibility').html('AgoraRTC supported.');
      } else {
        $('#compatibility').html(
          'AgoraRTC not fully supported and some functions may be lost.'
        );
      }

      AgoraRTC.getDevices((devices: any[]) => {
        let videoHtml = '';
        let audioHtml = '';
        devices.forEach((item) => {
          if (item.kind === 'audioinput') {
            audioHtml +=
              '<option value=' + item.deviceId + '>' + item.label + '</option>';
          }
          if (item.kind === 'videoinput') {
            videoHtml +=
              '<option value=' + item.deviceId + '>' + item.label + '</option>';
          }
        });
        $('#cameraId').html(videoHtml);
        $('#microphoneId').html(audioHtml);
        resolve();
      });
    });
  }
  ngOnInit(): void {}

  handleEvents(rtc: any) {
    rtc.client.on('error', (err: string) => {
      console.log(err);
    });

    rtc.client.on('peer-leave', (evt: any) => {
      var id = evt.uid;
      console.log('id', evt);
      let streams = rtc.remoteStreams.filter((e: any) => id !== e.getId());
      let peerStream = rtc.remoteStreams.find((e: any) => id === e.getId());
      if (peerStream && peerStream.isPlaying()) {
        peerStream.stop();
      }
      rtc.remoteStreams = streams;
      if (id !== rtc.params.uid) {
        this.removeView(id);
      }
      console.log('peer-leave', id);
    });
    // Occurs when the peer user leaves the channel; for example, the peer user calls Client.leave.

    // Occurs when the local stream is published.
    rtc.client.on('stream-published', (evt: any) => {
      console.log('stream-published');
    });

    rtc.client.on('stream-added', (evt: any) => {
      var remoteStream = evt.stream;
      var id = remoteStream.getId();

      if (id !== rtc.params.uid) {
        rtc.client.subscribe(remoteStream, (err: any) => {
          console.log('stream subscribe failed', err);
        });
      }
      console.log('stream-added remote-uid: ', id);
    });

    rtc.client.on('stream-subscribed', (evt: any) => {
      var remoteStream = evt.stream;
      var id = remoteStream.getId();
      rtc.remoteStreams.push(remoteStream);
      this.addView(id);
      remoteStream.play('remote_video_' + id);
      console.log('stream-subscribed remote-uid: ', id);
    });

    rtc.client.on('stream-removed', (evt: any) => {
      var remoteStream = evt.stream;
      var id = remoteStream.getId();
      if (remoteStream.isPlaying()) {
        remoteStream.stop();
      }
      rtc.remoteStreams = rtc.remoteStreams.filter((stream: any) => {
        return stream.getId() !== id;
      });
      this.removeView(id);
      console.log('stream-removed remote-uid: ', id);
    });
    rtc.client.on('onTokenPrivilegeWillExpire', () => {
      // After requesting a new token
      // rtc.client.renewToken(token);
      console.log('onTokenPrivilegeWillExpire');
    });
    rtc.client.on('onTokenPrivilegeDidExpire', () => {
      // After requesting a new token
      // client.renewToken(token);
      console.log('onTokenPrivilegeDidExpire');
    });
  }
  addView(id: any, show: any = true) {
    console.log('este es el creador de addViwe');
    if (!$('#' + id)[0]) {
      $('<div/>', {
        id: 'remote_video_panel_' + id,
        class: 'video-view',
      }).appendTo('#video');

      $('<div/>', {
        id: 'remote_video_' + id,
        class: 'video-placeholder',
      }).appendTo('#remote_video_panel_' + id);

      $('<div/>', {
        id: 'remote_video_info_' + id,
        class: 'video-profile ' + (show ? '' : 'hide'),
      }).appendTo('#remote_video_panel_' + id);

      $('<div/>', {
        id: 'video_autoplay_' + id,
        class: 'autoplay-fallback hide',
      }).appendTo('#remote_video_panel_' + id);
    }
  }

  removeView(id: string) {
    if ($('#remote_video_panel_' + id)[0]) {
      $('#remote_video_panel_' + id).remove();
    }
  }

  leaveAction() {
    this.leave(this.rtc);
  }

  leave(rtc: any) {
    rtc.client.leave(
      () => {
        // stop stream
        if (rtc.localStream.isPlaying()) {
          rtc.localStream.stop();
        }
        // close stream
        rtc.localStream.close();
        for (let i = 0; i < rtc.remoteStreams.length; i++) {
          var stream = rtc.remoteStreams.shift();
          var id = stream.getId();
          if (stream.isPlaying()) {
            stream.stop();
          }
          this.removeView(id);
        }
        rtc.localStream = null;
        rtc.remoteStreams = [];
        rtc.client = null;
        console.log('client leaves channel success');
        rtc.published = false;
        rtc.joined = false;
        console.log('leave success');
      },
      (err: any) => {
        console.log('channel leave failed');
        console.log('leave success');
        console.error(err);
      }
    );
  }

  join() {
    /**
     * rtc: rtc object
     * option: {
     *  mode: string, "live" | "rtc"
     *  codec: string, "h264" | "vp8"
     *  appID: string
     *  channel: string, channel name
     *  uid: number
     *  token; string,
     * }
     **/

    this.rtc.client = AgoraRTC.createClient({
      mode: 'rtc',
      codec: 'h264',
    });

    let option = {
      mode: 'rtc',
      codec: 'h264',
      appID: '9e6a9b0a859c4a7e9efe79b797c80b98',
      channel: 'test',
      uid: '',
      microphoneId: $('#microphoneId').val(),
      cameraId: $('#cameraId').val(),
      token:
        '0069e6a9b0a859c4a7e9efe79b797c80b98IAAy7+KDG+9v7BikcGSO112yjjSKKdrPJYQp4XbNoweeAAx+f9gAAAAAEABwjq6PnnghYAEAAQCeeCFg',
    };

    this.rtc.params = option;

    this.handleEvents(this.rtc);

    this.rtc.client.init(
      option.appID,
      () => {
        console.log('init success');

        /**
         * Joins an AgoraRTC Channel
         * This method joins an AgoraRTC channel.
         * Parameters
         * tokenOrKey: string | null
         *    Low security requirements: Pass null as the parameter value.
         *    High security requirements: Pass the string of the Token or Channel Key as the parameter value. See Use Security Keys for details.
         *  channel: string
         *    A string that provides a unique channel name for the Agora session. The length must be within 64 bytes. Supported character scopes:
         *    26 lowercase English letters a-z
         *    26 uppercase English letters A-Z
         *    10 numbers 0-9
         *    Space
         *    "!", "#", "$", "%", "&", "(", ")", "+", "-", ":", ";", "<", "=", ".", ">", "?", "@", "[", "]", "^", "_", "{", "}", "|", "~", ","
         *  uid: number | null
         *    The user ID, an integer. Ensure this ID is unique. If you set the uid to null, the server assigns one and returns it in the onSuccess callback.
         *   Note:
         *      All users in the same channel should have the same type (number or string) of uid.
         *      If you use a number as the user ID, it should be a 32-bit unsigned integer with a value ranging from 0 to (232-1).
         **/
        this.rtc.client.join(
          option.token ? option.token : null,
          option.channel,
          option.uid == '' ? +option.uid : null,
          (uid: string) => {
            console.log(
              'join channel: ' + option.channel + ' success, uid: ' + uid
            );
            console.log(
              'join channel: ' + option.channel + ' success, uid: ' + uid
            );
            console.log(
              'join channel: ' + option.channel + ' success, uid: ' + uid
            );
            this.rtc.joined = true;

            this.rtc.params.uid = uid;

            // create local stream+
            let localStream = AgoraRTC.createStream({
              streamID: this.rtc.params.uid,
              audio: true,
              video: true,
              screen: false,
              microphoneId: option.microphoneId,
              cameraId: option.cameraId,
            });
            this.rtc.localStream = localStream;

            console.log('local ========');
            console.log(localStream);
            console.log('local ======== this');
            console.log(this.rtc.localStream);

            // initialize local stream. Callback function executed after intitialization is done
            localStream.init(
              () => {
                console.log('init local stream success');
                // play stream with html element id "local_stream"

                console.log('evento local_stream');
                localStream.play('local_stream');

                this.rtc.client.publish(localStream, (err: any) => {
                  console.error(err);
                });

                // publish local stream
              },
              (err: any): void => {
                console.log(
                  'stream init failed, please open console see more detail'
                );
                console.error('init local stream failed ', err);
              }
            );
          },
          (err: any) => {
            console.log(
              'client join failed, please open console see more detail'
            );
            console.error('client join failed', err);
          }
        );
      },
      (err: any) => {
        console.log('client init failed, please open console see more detail');
        console.error(err);
      }
    );
  }
}
