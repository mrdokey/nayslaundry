export function useAuth() {
    const { ref, onMounted } = Vue;
    const isLoggedIn = ref(false);
    const isApk = ref(false);
    const phoneNumber = ref('');
    const otpSent = ref(false);
    const generatedOtp = ref('');
    const inputOtp = ref('');
    const isLoadingOtp = ref(false);

    onMounted(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('apk') === 'true') {
            isApk.value = true;
            isLoggedIn.value = true;
        } else if (localStorage.getItem('nays_logged_in') === 'true') {
            isLoggedIn.value = true;
        }
    });

    const sendOtpCode = async () => {
        let phone = phoneNumber.value.replace(/[^0-9]/g, '');
        if (!phone) { alert("Harap masukkan nomor WA."); return; }
        if (phone.startsWith('0')) phone = '62' + phone.substring(1);
        else if (!phone.startsWith('62')) phone = '62' + phone;

        if (phone !== '628123654594' && phone !== '62895428400665') {
            alert("Akses ditolak. Nomor WhatsApp tidak terdaftar."); return;
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const waUrl = `https://wa.mrdsolution.my.id/api/send-message?key=7BC82018076500360255A4E0F78D52C7&session=botmrd&to=${phone}&text=${encodeURIComponent(`Kode OTP Nays Laundry: *${otp}*`)}`;

        isLoadingOtp.value = true;
        try {
            await fetch(waUrl, { mode: 'no-cors' });
            generatedOtp.value = otp;
            otpSent.value = true;
            alert("OTP terkirim!");
        } catch (e) { alert("Gagal: " + e.message); } 
        finally { isLoadingOtp.value = false; }
    };

    const verifyOtpCode = () => {
        if (inputOtp.value.toString() === generatedOtp.value.toString()) {
            isLoggedIn.value = true;
            localStorage.setItem('nays_logged_in', 'true');
        } else { alert("Kode OTP salah."); }
    };

    const logoutAdmin = () => {
        if (confirm("Keluar sistem?")) {
            isLoggedIn.value = false;
            localStorage.removeItem('nays_logged_in');
            otpSent.value = false; phoneNumber.value = ''; inputOtp.value = '';
        }
    };

    return { isLoggedIn, isApk, phoneNumber, otpSent, inputOtp, isLoadingOtp, sendOtpCode, verifyOtpCode, logoutAdmin };
}