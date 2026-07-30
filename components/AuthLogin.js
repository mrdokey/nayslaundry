export default {
    name: 'AuthLogin',
    props: ['phoneNumber', 'otpSent', 'inputOtp', 'isLoadingOtp'],
    emits: ['update:phoneNumber', 'update:inputOtp', 'sendOtp', 'verifyOtp'],
    template: `
        <div class="flex items-center justify-center min-h-screen w-full p-4 bg-slate-100 print:hidden">
            <div class="w-full max-w-sm bg-white p-5 rounded-2xl shadow-md border text-center space-y-4">
                <div class="flex flex-col items-center">
                    <div class="w-12 h-12 rounded-full bg-indigo-900 text-white flex items-center justify-center font-bold text-lg mb-1 shadow">NL</div>
                    <h2 class="text-sm font-bold text-indigo-950">Gateway OTP Login</h2>
                    <p class="text-[10px] text-slate-400">Gunakan nomor admin terdaftar</p>
                </div>
                <div class="space-y-2 text-left">
                    <div v-if="!otpSent">
                        <label class="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nomor WhatsApp</label>
                        <input :value="phoneNumber" @input="$emit('update:phoneNumber', $event.target.value)" type="tel" placeholder="08123654594" class="w-full px-3 py-1.5 border rounded-lg text-xs">
                    </div>
                    <div v-else>
                        <label class="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kode OTP 6-Digit</label>
                        <input :value="inputOtp" @input="$emit('update:inputOtp', $event.target.value)" type="number" placeholder="------" class="w-full px-3 py-1.5 border rounded-lg text-center font-extrabold text-base tracking-widest">
                    </div>
                </div>
                <div class="pt-1">
                    <button v-if="!otpSent" @click="$emit('sendOtp')" :disabled="isLoadingOtp" class="w-full bg-indigo-900 text-white p-2 rounded-lg font-bold hover:bg-indigo-950 transition shadow">
                        {{ isLoadingOtp ? 'Mengirim...' : 'Kirim Kode OTP' }}
                    </button>
                    <button v-else @click="$emit('verifyOtp')" class="w-full bg-emerald-600 text-white p-2 rounded-lg font-bold hover:bg-emerald-700 transition shadow">
                        Verifikasi & Masuk
                    </button>
                </div>
            </div>
        </div>
    `
};