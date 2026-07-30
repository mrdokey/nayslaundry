export default {
    name: 'MasterItemView',
    props: ['services', 'showForm', 'isEditing', 'serviceForm'],
    emits: ['openAdd', 'openEdit', 'closeForm', 'save', 'delete'],
    setup(props) {
        const searchQuery = Vue.ref('');
        const expandedCategories = Vue.ref([]); // Default tertutup (array kosong)

        // Otomatis mengelompokkan barang lama berdasarkan nama barang
        const getServiceCategory = (item) => {
            if (item.kategori && item.kategori.trim() !== '') return item.kategori;
            const name = (item.nama_layanan || '').toLowerCase();
            if (name.includes('express') || name.includes('spotting')) return 'Layanan Khusus';
            if (name.includes('towel') || name.includes('mat') || name.includes('spa') || name.includes('kimono')) return 'Handuk & Kamar Mandi';
            if (name.includes('napkin') || name.includes('sofa') || name.includes('cushion')) return 'F&B & Penutup';
            if (name.includes('shirt') || name.includes('dress') || name.includes('jeans') || name.includes('pajamas') || name.includes('sarung') || name.includes('scarf') || name.includes('topi') || name.includes('boxer') || name.includes('panties') || name.includes('bra') || name.includes('swimsuit') || name.includes('socks') || name.includes('baby')) return 'Pakaian Tamu';
            return 'Linen Kamar';
        };

        // Mengambil daftar nama kategori unik yang sudah ada
        const existingCategories = Vue.computed(() => {
            const set = new Set(props.services.map(s => getServiceCategory(s)));
            return Array.from(set).sort();
        });

        // Mengelompokkan item berdasarkan kategori & menyaring hasil pencarian
        const groupedServices = Vue.computed(() => {
            const q = searchQuery.value.toLowerCase().trim();
            const filtered = !q ? props.services : props.services.filter(s => 
                s.nama_layanan.toLowerCase().includes(q) || 
                getServiceCategory(s).toLowerCase().includes(q)
            );

            const groups = {};
            filtered.forEach(item => {
                const cat = getServiceCategory(item);
                if (!groups[cat]) groups[cat] = [];
                groups[cat].push(item);
            });
            return groups;
        });

        const toggleCategory = (cat) => {
            const idx = expandedCategories.value.indexOf(cat);
            if (idx > -1) {
                expandedCategories.value.splice(idx, 1);
            } else {
                expandedCategories.value.push(cat);
            }
        };

        const isCategoryExpanded = (cat) => {
            if (searchQuery.value.trim() !== '') return true; // Otomatis terbuka saat mengetik pencarian
            return expandedCategories.value.includes(cat);
        };

        return {
            searchQuery,
            existingCategories,
            groupedServices,
            toggleCategory,
            isCategoryExpanded
        };
    },
    template: `
        <section class="space-y-3">
            <div class="flex justify-between items-center">
                <h2 class="text-base font-bold">Master Item Laundry</h2>
                <button @click="$emit('openAdd')" class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-700 shadow text-xs">+ Tambah Item</button>
            </div>

            <!-- Kolom Pencarian -->
            <div v-if="!showForm" class="w-full max-w-xs">
                <input v-model="searchQuery" type="text" placeholder="🔍 Cari item atau kategori..." class="w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-indigo-500">
            </div>

            <!-- Form Tambah / Edit Master Item -->
            <div v-if="showForm" class="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 class="font-bold text-slate-700 text-xs">{{ isEditing ? 'Ubah Layanan' : 'Tambah Layanan Baru' }}</h3>
                <form @submit.prevent="$emit('save')" class="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Nama Layanan</label>
                        <input v-model="serviceForm.nama_layanan" type="text" required class="w-full p-2 border rounded text-xs">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Kategori</label>
                        <!-- Datalist: Pilihan kategori existing + opsi ketik kategori baru -->
                        <input v-model="serviceForm.kategori" list="category-list" placeholder="Pilih / ketik baru..." class="w-full p-2 border rounded text-xs" required>
                        <datalist id="category-list">
                            <option v-for="cat in existingCategories" :key="cat" :value="cat"></option>
                        </datalist>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Satuan</label>
                        <select v-model="serviceForm.satuan" required class="w-full p-2 border rounded text-xs">
                            <option value="Pcs">Pcs</option>
                            <option value="Kg">Kg</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Harga Standar (Rp)</label>
                        <input v-model.number="serviceForm.harga_standar" type="number" required class="w-full p-2 border rounded text-xs">
                    </div>
                    <div class="md:col-span-4 flex justify-end space-x-2 pt-2 border-t">
                        <button type="button" @click="$emit('closeForm')" class="px-3 py-1 bg-slate-100 rounded text-xs">Batal</button>
                        <button type="submit" class="bg-indigo-600 text-white px-4 py-1 rounded font-semibold text-xs shadow">Simpan</button>
                    </div>
                </form>
            </div>

            <!-- Accordion Grouping List -->
            <div v-if="!showForm" class="space-y-2">
                <div v-for="(items, catName) in groupedServices" :key="catName" class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <!-- Header Accordion -->
                    <button @click="toggleCategory(catName)" type="button" class="w-full p-3 bg-slate-50 hover:bg-slate-100 flex justify-between items-center transition border-b border-slate-100">
                        <div class="flex items-center space-x-2">
                            <span class="font-bold text-slate-800 text-xs">{{ catName }}</span>
                            <span class="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">{{ items.length }} item</span>
                        </div>
                        <span class="text-slate-400 font-bold text-xs">{{ isCategoryExpanded(catName) ? '▲' : '▼' }}</span>
                    </button>

                    <!-- Isi Item dalam Kategori (Default Closed) -->
                    <div v-show="isCategoryExpanded(catName)" class="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white">
                        <div v-for="item in items" :key="item.id" class="bg-slate-50 p-2.5 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between gap-1.5">
                            <div>
                                <h4 class="font-bold text-slate-800 text-xs">{{ item.nama_layanan }}</h4>
                                <span class="px-2 py-0.5 bg-white border text-slate-600 rounded text-[9px] font-bold uppercase inline-block mt-0.5">{{ item.satuan }}</span>
                            </div>
                            <div class="flex justify-between items-center pt-1.5 border-t border-slate-200/60">
                                <span class="font-bold text-slate-700 text-xs">Rp {{ item.harga_standar.toLocaleString() }}</span>
                                <div class="space-x-2 shrink-0 text-xs">
                                    <button @click="$emit('openEdit', item)" class="text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                                    <button @click="$emit('delete', item.id)" class="text-red-500 hover:text-red-700 font-medium">Hapus</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="Object.keys(groupedServices).length === 0" class="p-8 text-center text-slate-400 bg-white rounded-xl border">
                    Tidak ada item laundry ditemukan.
                </div>
            </div>
        </section>
    `
};