// This file assumes 'webex.js' and 'date.format.js' are loaded BEFORE this script.
// Also assumes 'alpine.js' has been modified to NOT auto-start.

const hostMessage = `Hello! A visitor has just arrived in the reception, and registered you as their host.

Details:

* Name: **$name**
* Email: **$email**
`;

// Define the Alpine data component
Alpine.data('dataModel', () => ({
    page: 'home',
    name: '',
    email: '',
    date: 'October 6, 2022',
    time: '10:35 AM',
    roomId: '',
    configError: false,
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
        this.roomId = params.get('roomId');
        this.mapUrl = params.get('map') || this.mapUrl;
        this.theme = params.get('theme');

        /*if (this.theme) {
            const head = document.getElementsByTagName("head")[0];
            head.insertAdjacentHTML(
                "beforeend",
                `<link rel="stylesheet" href="styles/theme-cisco.css" />`);
        } */

        if (!this.getToken() || !this.roomId) {
            this.configError = true;
            this.page = 'configError';
        }
    },

    home() {
        this.page = 'home';
        this.reset();
        this.configError = false;
    },

    reset() {
        this.name = '';
        this.email = '';
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
        } else if (this.page === 'checkOut') {
            return this.email.match(emailPattern);
        }
        return true;
    },

    checkIn() {
        this.page = 'checkIn';
        this.focus('#name');
    },

    focus(id) {
        setTimeout(() => {
            const firstInput = document.querySelector(id);
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    },

    register() {
        this.page = 'registered';
        // Host messaging functionality removed for event attendee kiosk
    },

    getToken() {
        return new URLSearchParams(location.search).get('token');
    },

    getRoomId() {
        return new URLSearchParams(location.search).get('roomId');
    },

    next() {
        const { page } = this;

        if (page === 'home') {
            this.checkIn();
        } else if (page === 'checkIn') {
            const token = this.getToken();
            const roomId = this.getRoomId();
            const visitorName = this.name.trim();

            validateVisitorInSpace(visitorName, token, roomId, (isAuthenticated) => {
                if (isAuthenticated) {
                    this.showPhotoPage();
                } else {
                    this.page = 'notRegistered';
                }
            });
        } else if (page === 'photo') {
            this.showConfirmation();
        } else if (page === 'confirm') {
            this.register();
        } else if (page === 'checkOut') {
            this.page = 'checkOutResult';
        } else {
            console.error('unknown next page');
        }
    },

    back() {
        const { page } = this;
        if (page === 'checkIn') {
            this.home();
        } else if (page === 'photo') {
            this.checkIn();
        } else if (page === 'confirm') {
            this.showPhotoPage();
        } else {
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
        } catch (e) {
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

        const format = 'jpeg';
        this.photo = canvas.toBlob(photo => {
            this.photo = new File([photo], this.name + '.' + format, { type: "image/" + format, });
        }, 'image/' + format);
    },

    updateTimeAndDate() {
        const now = new Date();
        this.date = now.format('mmmm d, yyyy');
        this.time = now.format('HH:MM');
    },

    photoSrc() {
        if (!this.photo) return;
        const url = window.URL.createObjectURL(this.photo);
        console.log('created', url);
        return url;
    }
}));

// Manually start Alpine.js AFTER the component has been registered
document.addEventListener('DOMContentLoaded', () => {
    Alpine.start();
    console.log("Alpine.start() called.");
});

console.log("index.js finished executing."); // Final debug message