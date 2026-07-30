export default {
    name: 'MasterItemView',
    props: ['services', 'showForm', 'isEditing', 'serviceForm'],
    emits: ['openAdd', 'openEdit', 'closeForm', 'save', 'delete', 'importGuest'],
    template: `
        <section class="space-y-3">
            <div class="flex justify-between items-center">
                <h2 class="text-base font-bold">Master Item Laundry</h2>
                <div class="flex space-x-2">
                    <button @click="$emit('importGuest')" class="bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-semibold text-[10px]">📥 Impor 18 Item Guest</button>
                    <button @click="$emit('openAdd')" class="hidden md:block bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-700 shadow">+ Tambah</button>
                </div>
            </div>

            <div v-if="showForm" class="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 class="font-bold text-slate-700">{{ isEditing ? 'Ubah Layanan' : 'Tambah Layanan Baru' }}</h3>
                <form @submit.prevent="$emit('save')" class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Nama Layanan</label>
                        <input v-model="serviceForm.nama_layanan" type="text" required class="w-full p-2 border rounded text-xs">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Satuan</label>
                        <select v-model="serviceForm.satuan" required class="w-full p-2 border rounded text-xs">
                            <option value="Pcs">Pcs</option>
                            <option value="Kg">Kg</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Harga Standar</label>
                        <input v-model.number="serviceForm.harga_standar" type="number" required class="w-full p-2 border rounded text-xs">
                    </div>
                    <div class="md:col-span-3 flex justify-end space-x-2 pt-2">
                        <button type="button" @click="$emit('closeForm')" class="px-3 py-1 bg-slate-100 rounded">Batal</button>
                        <button type="submit" class="bg-indigo-600 text-white px-4 py-1 rounded font-semibold shadow">Simpan</button>
                    </div>
                </form>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div v-for="item in services" :key="item.id" class="bg-white p-3 rounded-xl border shadow-sm flex flex-col justify-between gap-1.5">
                    <div>
                        <h4 class="font-bold text-slate-800 text-xs">{{ item.nama_layanan }}</h4>
                        <span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase inline-block mt-0.5">{{ item.satuan }}</span>
                    </div>
                    <div class="flex justify-between items-center pt-1.5 border-t">
                        <span class="font-bold text-slate-600">Rp {{ item.harga_standar.toLocaleString() }}</span>
                        <div class="space-x-2 shrink-0">
                            <button @click="$emit('openEdit', item)" class="text-indigo-600">Edit</button>
                            <button @click="$emit('delete', item.id)" class="text-red-500">Hapus</button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `
};