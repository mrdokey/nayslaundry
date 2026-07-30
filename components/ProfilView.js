export default {
    name: 'ProfilView',
    props: ['profile'],
    emits: ['save'],
    template: `
        <section class="max-w-md space-y-4">
            <h2 class="text-base font-bold">Profil Perusahaan</h2>
            <div class="bg-white p-4 rounded-xl border">
                <form @submit.prevent="$emit('save')" class="space-y-3">
                    <div>
                        <label class="block font-semibold text-slate-400 mb-0.5">Nama Laundry</label>
                        <input v-model="profile.nama_laundry" type="text" required class="w-full p-2 border rounded text-xs">
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-400 mb-0.5">Nomor Telepon</label>
                        <input v-model="profile.no_telepon" type="text" required class="w-full p-2 border rounded text-xs">
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-400 mb-0.5">Alamat</label>
                        <textarea v-model="profile.alamat" rows="2" class="w-full p-2 border rounded focus:outline-indigo-500 text-xs"></textarea>
                    </div>
                    <div class="grid grid-cols-3 gap-2">
                        <div>
                            <label class="block font-semibold text-slate-400 mb-0.5">Nama Bank</label>
                            <input v-model="profile.bank_cabang" type="text" placeholder="BCA" class="w-full p-2 border rounded text-xs">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-400 mb-0.5">No. Rekening</label>
                            <input v-model="profile.bank_nomor" type="text" placeholder="123456" class="w-full p-2 border rounded text-xs">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-400 mb-0.5">A/N Pemilik</label>
                            <input v-model="profile.bank_nama" type="text" placeholder="Nama Pemilik" class="w-full p-2 border rounded text-xs">
                        </div>
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-400 mb-0.5">URL Logo</label>
                        <input v-model="profile.logo_url" type="text" placeholder="https://domain.com/logo.png" class="w-full p-2 border rounded text-xs">
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-400 mb-0.5">Syarat & Ketentuan (TOS) Invoice</label>
                        <textarea v-model="profile.tos" rows="3" placeholder="Aturan 1&#10;Aturan 2" class="w-full p-2 border rounded focus:outline-indigo-500 text-xs"></textarea>
                    </div>
                    <div class="flex justify-end pt-1">
                        <button type="submit" class="bg-indigo-600 text-white px-5 py-2 rounded font-semibold shadow">Simpan</button>
                    </div>
                </form>
            </div>
        </section>
    `
};