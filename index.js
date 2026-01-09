// This is the CORRECTED content for your index.js file.
// It matches the original index.js.txt from the first prompt,
// but with the host functionality removed as per your request.

// REMOVED: let currentSearchNumber = 0; from this file. It belongs ONLY in webex.js.

const hostMessage = `Hello! A visitor has just arrived in the reception, and registered you as their host.

Details:

* Name: **$name**
* Email: **$email**
`;

const dataModel = {
// home > checkIn > photo > confim > registered | checkOut > checkOutResult
  page: 'home',
  name: '',
  email: '',
  // REMOVED: hostSearch: '',
  // REMOVED: currentHost: null,
  date: 'October 6, 2022',
  time: '10:35 AM',
  roomId: '', // New: Webex Room ID for visitor authentication
  configError: false, // New: Flag for missing configuration
  // REMOVED: foundHosts: [],
  // REMOVED: searchStatus: '',
  photo: null,
  photoTimer: 0,
  photoTime: 0,
  videoStream: null,
  phoneNumber: '',
  taxiNumber: '',
  mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d37964.479957946394!2d-121.95893677399364!3d37.41713987799405!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x808fc911562d481f%3A0xd3d896b473be003!2sCisco%20Systems%20Building%2012!5e0!3m2!1sen!2sno!4v1674211511880!5m2!1sen!2sno',

  init() {
    this.updateTimeAndDate();
    setInterval(() => this.updateTimeAndDate(), 30 * 1000);
    const params = new URLSearchParams(location.search);
    this.roomId = params.get('roomId'); // New: Get roomId from URL
    this.mapUrl = params.get('map') || this.mapUrl;
    this.theme = params.get('theme');

    if (this.theme) {
      const head = document.getElementsByTagName("head")[0];
      head.insertAdjacentHTML(
        "beforeend",
        `<link rel="stylesheet" href="styles/theme-cisco.css" />`);
    }

    // New: Check for required parameters
    if (!this.getToken() || !this.roomId) {
      this.configError = true;
      this.page = 'configError'; // Set page to config error state
    }
  },

  home() {
    this.page = 'home';
    this.reset();
    this.configError = false; // New: Reset configError when going home
  },

  reset() {
    this.name = '';
    this.email = '';
    // REMOVED: this.currentHost = null;
    // REMOVED: this.foundHosts = [];
    // REMOVED: this.searchStatus = '';
    this.photo = null;
    this.phoneNumber = '';
    clearInterval(this.photoTimer);
  },

  call() {
    const defaultNumber = 'erica.talking@ivr.vc';
    const number = new URLSearchParams(location.search).get('reception') || defaultNumber;
    location.href = `sip:${number}`;
  },

  get validForm() {
    const emailPattern = /\w+@\w+/;
    if (this.page === 'checkIn') {
      return this.name.trim().length && this.email.match(emailPattern);
    }
    else if (this.page === 'checkOut') {
      return this.email.match(emailPattern);
    }
    /*else if (page === 'taxi') {
      return this.phoneNumber.length > 3;
    }*/
    return true;
  },

  checkIn() {
    this.page = 'checkIn';
    this.focus('#name');
  },

  focus(id) {
    // need to wait for DOM to be updated
    setTimeout(() => {
      const firstInput = document.querySelector(id);
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);

  },

  register() {
    this.page = 'registered';
    // The hostMessage logic is still here, but currentHost is removed.
    // We can remove this entire block if no message is ever sent.
    const msg = hostMessage
      .replace('$name', this.name.trim())
      .replace('$email', this.email.trim());
    // if (!this.currentHost) { // This will now always be true since currentHost is removed
    //   // If no host, we might want to send a generic message or just log
    //   console.log("No specific host selected, but visitor registered.");
    //   // return; // Uncomment this if you want to prevent message sending without a host
    // }
   },

  getToken() {
    // TODO perhaps use localStorage intead?
    return new URLSearchParams(location.search).get('token');
  },
  // New: Helper to get roomId from URL
  getRoomId() {
    return new URLSearchParams(location.search).get('roomId');
  },

  next() {
    // home > checkIn > photo > confim > registered
    const { page } = this;

    if (page === 'home') {
      this.checkIn();
    }
    else if (page === 'checkIn') {
      // New: Authenticate visitor against the Webex space before proceeding
      const token = this.getToken();
      const roomId = this.getRoomId();
      const visitorName = this.name.trim(); // Still using name for now, will change to email in a later step

      validateVisitorInSpace(visitorName, token, roomId, (isAuthenticated) => {
        if (isAuthenticated) {
          this.showPhotoPage(); // Visitor found in space, proceed to photo page (SKIPPING findHost)
        } else {
          this.page = 'notRegistered'; // Visitor not found, show error page
        }
      });
    }
    else if (page === 'photo') {
      this.showConfirmation();
    }
    else if (page === 'confirm') {
      this.register();
    }
    else if (page === 'checkOut') {
      this.page = 'checkOutResult';
    }
    /*else if (page === 'taxi') {
      this.taxiNumber = Math.ceil(Math.random() * 10000);
      this.page = 'taxiConfirmed';
    }*/

    else {
      console.error('unknown next page');
    }
  },

  back() {
    // home > checkIn > photo > confim > registered | checkOut
    const { page } = this;
    if (page === 'checkIn') {
      this.home();
    }
    else if (page === 'photo') {
      this.checkIn(); // Back from photo goes to checkIn
    }
    else if (page === 'confirm') {
      this.showPhotoPage();
    }
    else {
      console.error('unknown previous page');
    }

  },

  showConfirmation() {
    this.stopCamera();
    this.page = 'confirm';
  },

  checkout() {
    this.page = 'checkOutResult';
  },

  async showPhotoPage() {
    this.page = 'photo';
    try {
      if (navigator.mediaDevices.getUserMedia) {
        this.videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.querySelector('.webcam');
        video.srcObject = this.videoStream;
      }
    }
    catch(e) {
      console.error('not able to get video', e);
    }
  },

  stopCamera() {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => {
        track.stop();
      });
    }
  },

  takePhotoCountdown() {
    this.photo = null;
    document.querySelector('.photo-flash').classList.remove('blink');
    clearInterval(this.photoTimer);
    this.photoTime = 3;
    this.photoTimer = setInterval(() => {
      this.photoTime -= 1;
      if (this.photoTime < 1) {
        clearInterval(this.photoTimer);
        this.takePhoto();
      }
    }, 1000);
  },

  takePhoto() {
    // user has navigated away, skip
    if (this.page !== 'photo') {
      return;
    }

    document.querySelector('#shutter-sound').play();
    document.querySelector('.photo-flash').classList.add('blink');

    const w = 600;
    const h = 337;
    const canvas = document.querySelector('.photo');
    canvas.setAttribute('width', w);
    canvas.setAttribute('height', h);

    const video = document.querySelector('.webcam');
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, 600, 337);
    // this.photo = canvas.toDataURL('image/jpeg');

    const format = 'jpeg';
    this.photo = canvas.toBlob(photo => {
      this.photo = new File([photo], this.name + '.' + format, { type: "image/" + format, });
    }, 'image/' + format);

    // to compress for jpeg for webex cards, look at:
    // https://github.com/jpeg-js/jpeg-js/blob/master/lib/encoder.js
  },

  checkOut() {
    this.page = 'checkOut';
  },

  updateTimeAndDate() {
    const now = new Date();
    this.date = now.format('mmmm d, yyyy');
    this.time = now.format('HH:MM');
  },

  // create img data url from blob
  photoSrc() {
    if (!this.photo) return;
    const url = window.URL.createObjectURL(this.photo);
    console.log('created', url);
    return url;
  }
};