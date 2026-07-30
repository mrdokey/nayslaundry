import { db, doc, collection, addDoc, updateDoc, deleteDoc, onSnapshot } from "../firebase-db.js";

// Wajib menggunakan kata kunci 'export' di depan function
export function useLayanan() {
    const { ref, onMounted } = Vue;
    const services = ref([]);
    const showServiceForm = ref(false);
    const isEditingService = ref(false);
    const serviceForm = ref({ id: '', nama_layanan: '', satuan: 'Pcs', harga_standar: 0, kategori: 'Linen Kamar' });

    onMounted(() => {
        onSnapshot(collection(db, "layanan"), (snap) => {
            const list = []; snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
            services.value = list.sort((a, b) => a.nama_layanan.localeCompare(b.nama_layanan));
        });
    });

    const getServiceName = (id) => { const s = services.value.find(x => x.id === id); return s ? s.nama_layanan : 'Item'; };
    const getServiceUnit = (id) => { const s = services.value.find(x => x.id === id); return s ? s.satuan : 'Pcs'; };

    const getServiceCategory = (item) => {
        if (item.kategori && item.kategori.trim() !== '') return item.kategori;
        const name = (item.nama_layanan || '').toLowerCase();
        if (name.includes('express') || name.includes('spotting')) return 'Layanan Khusus';
        if (name.includes('towel') || name.includes('mat') || name.includes('spa') || name.includes('kimono')) return 'Handuk & Kamar Mandi';
        if (name.includes('napkin') || name.includes('sofa') || name.includes('cushion')) return 'F&B & Penutup';
        if (name.includes('shirt') || name.includes('dress') || name.includes('jeans') || name.includes('pajamas') || name.includes('sarung') || name.includes('scarf') || name.includes('topi') || name.includes('boxer') || name.includes('panties') || name.includes('bra') || name.includes('swimsuit') || name.includes('socks') || name.includes('baby')) return 'Pakaian Tamu';
        return 'Linen Kamar';
    };

    const openAddService = () => { 
        isEditingService.value = false; 
        serviceForm.value = { id: '', nama_layanan: '', satuan: 'Pcs', harga_standar: 0, kategori: 'Linen Kamar' }; 
        showServiceForm.value = true; 
    };

    const openEditService = (item) => { 
        isEditingService.value = true; 
        serviceForm.value = { 
            ...item, 
            kategori: getServiceCategory(item) 
        }; 
        showServiceForm.value = true; 
    };

    const saveService = async () => {
        try {
            if (isEditingService.value) {
                await updateDoc(doc(db, "layanan", serviceForm.value.id), {
                    nama_layanan: serviceForm.value.nama_layanan,
                    satuan: serviceForm.value.satuan,
                    harga_standar: Number(serviceForm.value.harga_standar),
                    kategori: serviceForm.value.kategori || 'Linen Kamar'
                });
            } else {
                await addDoc(collection(db, "layanan"), {
                    nama_layanan: serviceForm.value.nama_layanan,
                    satuan: serviceForm.value.satuan,
                    harga_standar: Number(serviceForm.value.harga_standar),
                    kategori: serviceForm.value.kategori || 'Linen Kamar',
                    tanggal_dibuat: new Date().toISOString()
                });
            }
            showServiceForm.value = false;
        } catch (e) { alert("Error: " + e.message); }
    };

    const deleteService = async (id) => { if (confirm("Hapus item?")) { try { await deleteDoc(doc(db, "layanan", id)); } catch (e) { alert("Error: " + e.message); } } };

    const importGuestServices = async () => {
        const items = [
            { name: "Shirt/Blouse", price: 5000 }, { name: "T-Shirt", price: 4000 }, { name: "Polo/Long Sleeved T-Shirt", price: 5000 },
            { name: "Sweater/Hoodie", price: 5000 }, { name: "Under Shirt/Tank Top", price: 3000 }, { name: "Shorts/Skirt", price: 5000 },
            { name: "Trousers/Long Skirt", price: 7000 }, { name: "Jeans", price: 8000 }, { name: "Briefs/Boxer/Panties", price: 3000 },
            { name: "Bra", price: 4000 }, { name: "Swimsuit", price: 4000 }, { name: "Socks/Kaos Kaki", price: 2500 },
            { name: "Long Dress", price: 9000 }, { name: "Pajamas/Baju Tidur", price: 7000 }, { name: "Sarong/Sarung", price: 3000 },
            { name: "Scarf/Selendang", price: 3000 }, { name: "Topi", price: 5000 }, { name: "Baby Clothes/Baju Bayi", price: 3000 }
        ];
        if (confirm(`Impor ${items.length} item Guest Laundry?`)) {
            let cnt = 0;
            try {
                for (const i of items) { await addDoc(collection(db, "layanan"), { nama_layanan: i.name, satuan: "Pcs", harga_standar: Number(i.price), tanggal_dibuat: new Date().toISOString() }); cnt++; }
                alert(`Sukses impor ${cnt} item!`);
            } catch (e) { alert("Error: " + e.message); }
        }
    };

    return { services, showServiceForm, isEditingService, serviceForm, getServiceName, getServiceUnit, openAddService, openEditService, saveService, deleteService, importGuestServices };
}