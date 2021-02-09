import { AfterViewInit, Component, OnInit } from '@angular/core';
declare var AgoraRTC: any;
declare var $: any;

var shareClient: any;
var shareStream: any;



//ocular elementos
//https://www.youtube.com/watch?v=kqv10KAhPAo

//grid osea los elemntos
//https://www.youtube.com/watch?v=b-hrxkgkG-s&t=276s

//elementos sobre posicionados
//https://www.youtube.com/watch?v=EqcyL3eU4os



export interface optionsVideoCall {
  mode?: string;
  codec?: string;
  appID?: string;
  channel?: string;
  uid?: string | number | null;
  microphoneId?: string;
  cameraId?: string;
  token: string;
}

export interface configCall {
  streamID?: string;
  audio?: boolean;
  video?: boolean;
  screen?: boolean;
  microphoneId?: any;
  cameraId?: any;
}

@Component({
  selector: 'app-video',
  templateUrl: './video.component.html',
  styleUrls: ['./video.component.css'],
})
export class VideoComponent implements OnInit, AfterViewInit {
  rtc = {
    client: AgoraRTC.createClient({
      mode: 'rtc',
      codec: 'vp8',
    }),
    joined: false,
    published: false,
    localStream: null,
    remoteStreams: [],
    params: {
      uid: '',
    },
  };

  remoteClients:any = [];

  options: optionsVideoCall | undefined;
  optionsShared: optionsVideoCall | undefined;

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
        class: 'video-view', //clase padre
      }).appendTo('#video');

      $('<div/>', {
        id: 'remote_video_' + id,
        class: 'video-placeholder', //clase principal de video tamño del video
      }).appendTo('#remote_video_panel_' + id);

      $('<div/>', {
        id: 'remote_video_info_' + id,
        class: 'video-profile ' + (show ? '' : 'hide'),
      }).appendTo('#remote_video_panel_' + id);

      $('<div/>', {
        id: 'video_autoplay_' + id,
        class: 'autoplay-fallback hide',
      }).appendTo('#remote_video_panel_' + id);

      this.remoteClients.push(id);
      console.log("..................this.remoteClients................");
      console.log(this.remoteClients);
    }
  }

  removeView(id: string) {
    if ($('#remote_video_panel_' + id)[0]) {
      $('#remote_video_panel_' + id).remove()


    this.remoteClients = this.remoteClients.filter((idremote:any) => idremote != id);
      console.log("++++++++++++++++Remove+++++++++++++++");
      console.log(this.remoteClients);
    }
  }

  leaveAction() {
    if (!this.rtc.joined) {
      console.log('You are not in channel');
      return;
    }
    this.leave(this.rtc);
  }

  shareEnd() {
    try {
      shareClient && shareClient.unpublish(shareStream);
      shareStream && shareStream.close();
      shareClient &&
        shareClient.leave(
          () => {
            console.log('Share client succeed to leave.');
          },
          () => {
            console.log('Share client failed to leave.');
          }
        );
    } finally {
      shareClient = null;
      shareStream = null;
    }
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

  shareStart() {
    shareClient = AgoraRTC.createClient({
      mode: 'rtc',
      codec: 'vp8',
    });

    this.clientInit(shareClient, this.optionsShared).then(
      async (uid: string): Promise<void> => {
        // New config for screen sharing stream
        let config: configCall = {
          streamID: uid,
          audio: false,
          video: false,
          screen: true,
        };

        // Intialize the screen sharing stream with the necessary parameters.
        shareStream = this.streamInit(uid, config);
        shareStream.init(
          () => {
            // Once the stream is intialized, update the relevant ui and publish the stream.
            shareStream.on('stopScreenSharing', (): void => {
              this.shareEnd();
              console.log('Stop Screen Sharing at' + new Date());
            });
            shareClient.publish(shareStream, (err: string) => {
              console.log('Publish share stream error: ' + err);
              console.log('getUserMedia failed', err);
            });
          },
          (err: string) => {
            console.log(err);
          }
        );
      }
    );
  }

  streamInit(uid: string, config: configCall): any {
    let stream = AgoraRTC.createStream(config);
    return stream;
  }

  clientInit(
    client: any,
    options: optionsVideoCall | undefined
  ): Promise<string> {
    return new Promise((resolve, reject): void => {
      // Initialize the agora client object with appid
      client.init(options?.appID, (): void => {
        client.join(
          options?.token,
          options?.channel,
          options?.uid == '' ? +options.uid : null,
          (uid: string) => {
            resolve(uid);
          },
          (err: string) => {
            reject(err);
          }
        );
      });
    });
  }

  join() {
    if (this.rtc.joined) {
      console.log('Your already joined');
      return;
    }
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
      codec: 'vp8',
    });

    let option = {
      mode: 'rtc',
      codec: 'vp8',
      appID: '9e6a9b0a859c4a7e9efe79b797c80b98',
      channel: 'test',
      uid: '',
      microphoneId: $('#microphoneId').val(),
      cameraId: $('#cameraId').val(),
      token:
        '0069e6a9b0a859c4a7e9efe79b797c80b98IAA/poy70O2n0034YyINqZvOE/cBvm8Y8vkiXmywSAqvUAx+f9gAAAAAEABwjq6PVwIiYAEAAQBXAiJg',
    };

    this.options = option;

    this.optionsShared = Object.assign({}, this.options);

    this.optionsShared.uid = null;

    this.rtc.params = option;

    this.handleEvents(this.rtc);

    this.clientInit(this.rtc.client, this.options).then((uid) => {
      this.rtc.joined = true;

      this.rtc.params.uid = uid;

      let config: configCall = {
        streamID: this.rtc.params.uid,
        audio: true,
        video: true,
        screen: false,
        microphoneId: option.microphoneId,
        cameraId: option.cameraId,
      };

      let localStream = this.streamInit(uid, config);
      this.rtc.localStream = localStream;
      localStream.init(
        () => {
          console.log('init local stream success');
          // play stream with html element id "local_stream"

          console.log('evento local_stream');
          localStream.play('local_stream');

          this.rtc.client.publish(localStream, (err: any) => {
            console.error(err);
          });

          this.rtc.published = true;

          // publish local stream
        },
        (err: any): void => {
          console.log(
            'stream init failed, please open console see more detail'
          );
          console.error('init local stream failed ', err);
        }
      );
    });
  }

  ActionEnableDisableVideo() {
    this.EnableDisableVideo(this.rtc.localStream);
  }
  EnableDisableVideo(localStream: any): void {
    localStream.isVideoOn()
      ? localStream.disableVideo()
      : localStream.enableVideo();
  }
  ActionEnableDisableAudio() {
    this.EnableDisableAudio(this.rtc.localStream);
  }
  EnableDisableAudio(localStream: any) {
    localStream.isAudioOn()
      ? localStream.disableAudio()
      : localStream.enableAudio();
  }
}
