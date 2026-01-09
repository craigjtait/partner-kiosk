// This file assumes 'webex.js' and 'date.format.js' are loaded BEFORE this script.

// Define the Alpine data component inside the alpine:init event listener
document.addEventListener('alpine:init', () => {
    console.log("Alpine.js init event fired. Registering dataModel component.");

    // MOVED hostMessage INSIDE the dataModel component
    const hostMessage = `Hello! A visitor has just arrived in the reception, and registered you as their host.

Details:

* Name: **$name**
* Email: **$email**
`;

    Alpine.data('dataModel', () => ({
        // hostMessage is now a local constant within this factory function,
        // or you can make it a property of the data object if it's dynamic.
        // For now, it's used directly in the register method if needed.
        // If it needs to be accessible as `this.hostMessage`, move it into the return object.
        // For simplicity, let's assume it's used within the `register` method and can be accessed there.

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
        mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d37964.479957946394!2d-121.95893677399405!3d37.41713987799405!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x808fc911562d481f%3A0xd3d896b473be003!2sCisco%20Systems%20Building%2012!5e0!3m2!1sen!2sno!4v1674211511880!5m2!1sen!2sno',

        init() {
            this.updateTimeAndDate();
            setInterval(() => this.updateTimeAndDate(), 30 * 1000);
            const params = new URLSearchParams(location.search);
            this.roomId = params.get('roomId');
            this.mapUrl = params.get('map') || this.mapUrl;
            this.theme = params.get('theme');

            if (this.theme) {
                const head = document.getElementsByTagName("head")[0];
                head.insertAdjacentHTML(
                    "beforeend",
                    `<link rel="stylesheet" href="styles/theme-cisco.css" />`);
            }

            if (!this.getToken() || !this.roomId) {
                this.configError = true;
                this.page = 'configError';
                console.error("init: Configuration error - missing token or roomId.");
            } else {
                console.log("init: Kiosk configured with roomId:", this.roomId);
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
            // If you need to use hostMessage here, you'd define it outside this function
            // or pass it in if it's a parameter. For now, it's a local const.
        },

        getToken() {
            return new URLSearchParams(location.search).get('token');
        },

        getRoomId() {
            return new URLSearchParams(location.search).get('roomId');
        },

        next() {
            const { page } = this;
            console.log('next: Current page:', page);

            if (page === 'home') {
                this.checkIn();
            } else if (page === 'checkIn') {
                const token = this.getToken();
                const roomId = this.getRoomId();
                const visitorEmail = this.email.trim();

                console.log('next (checkIn): Attempting to validate visitor in space using email:', visitorEmail);
                validateVisitorInSpace(visitorEmail, token, roomId, (isAuthenticated) => {
                    console.log('next (checkIn) callback: isAuthenticated =', isAuthenticated);
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
                    await this.$nextTick(); 
                    const video = this.$refs.webcam; 
                    if (video) {
                        video.srcObject = this.videoStream;
                        video.onloadedmetadata = () => {
                            video.play();
                        };
                    } else {
                        console.warn("showPhotoPage: Webcam video element not found via $refs.");
                    }
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
            console.log("takePhotoCountdown: Button clicked!");
            this.photo = null;
            if (this.$refs.photoFlash) {
                this.$refs.photoFlash.classList.remove('blink');
            } else {
                console.warn("takePhotoCountdown: photoFlash element not found via $refs.");
            }
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

            if (this.$refs.shutterSound) {
                this.$refs.shutterSound.play();
            } else {
                console.warn("takePhoto: shutterSound element not found via $refs.");
            }

            if (this.$refs.photoFlash) {
                this.$refs.photoFlash.classList.add('blink');
            } else {
                console.warn("takePhoto: photoFlash element not found via $refs.");
            }

            const w = 600;
            const h = 337;
            const canvas = this.$refs.photoCanvas;
            if (!canvas) {
                console.error("takePhoto: Canvas element not found via $refs.");
                return;
            }
            canvas.setAttribute('width', w);
            canvas.setAttribute('height', h);

            const video = this.$refs.webcam;
            if (!video) {
                console.error("takePhoto: Video element not found via $refs.");
                return;
            }
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
});

// REMOVED: Alpine.start(); and its console.log