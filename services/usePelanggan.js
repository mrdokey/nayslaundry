import { db, doc, setDoc, collection, addDoc, updateDoc, deleteDoc, onSnapshot } from "../firebase-db.js";

export function usePelanggan(services) {
    const { ref, onMounted, computed } = Vue;
    const customers = ref([]);
    const customPricesList = ref([]);
    const searchQueryCustomers = ref('');
    const showCustomerForm = ref(false);
    const isEditing = ref(false);
    const customerForm = ref({ id: '', nama_pelanggan: '', alamat: '', no_telepon: '', markup_persen: 0 });
    const selectedCustomer = ref(null);
    const tempPrices = ref({});

    onMounted(() => {
        onSnapshot(collection(db, "pelanggan"), (snap) => {
            const list = []; snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
            customers.value = list.sort((a, b) => a.nama_pelanggan.localeCompare(b.nama_pelanggan));
        });
        onSnapshot(collection(db, "harga_khusus"), (snap) => {
            const list = []; snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
            customPricesList.value = list;
        });
    });

    const getCustomerName = (id) => { const c = customers.value.find(x => x.id === id); return c ? c.nama_pelanggan : 'Tanpa Nama'; };
    const getCustomerAddress = (id) => { const c = customers.value.find(x => x.id === id); return c ? c.alamat : '-'; };
    
    // Helper mengambil persen markup pelanggan
    const getCustomerMarkup = (id) => {
        const c = customers.value.find(x => x.id === id);
        return (c && c.markup_persen) ? Number(c.markup_persen) : 0;
    };

    const getPrice = (custId, itemId) => {
        const pFound = customPricesList.value.find(p => p.id_pelanggan === custId && p.id_layanan === itemId);
        if (pFound && pFound.harga_custom !== undefined && pFound.harga_custom !== '') return Number(pFound.harga_custom);
        const s = (services.value || []).find(x => x.id === itemId); 
        return s ? Number(s.harga_standar) : 0;
    };

    const filteredCustomers = computed(() => {
        const q = searchQueryCustomers.value.toLowerCase().trim();
        return !q ? customers.value : customers.value.filter(c => c.nama_pelanggan.toLowerCase().includes(q) || c.alamat.toLowerCase().includes(q));
    });

    const openAddCustomer = () => { 
        isEditing.value = false; 
        customerForm.value = { id: '', nama_pelanggan: '', alamat: '', no_telepon: '', markup_persen: 0 }; 
        showCustomerForm.value = true; 
    };
    
    const openEditCustomer = (c) => { 
        isEditing.value = true; 
        customerForm.value = { ...c, markup_persen: c.markup_persen || 0 }; 
        showCustomerForm.value = true; 
    };

    const saveCustomer = async () => {
        try {
            const payload = {
                nama_pelanggan: customerForm.value.nama_pelanggan,
                alamat: customerForm.value.alamat,
                no_telepon: customerForm.value.no_telepon,
                markup_persen: Number(customerForm.value.markup_persen || 0)
            };

            if (isEditing.value) {
                await updateDoc(doc(db, "pelanggan", customerForm.value.id), payload);
            } else {
                payload.tanggal_bergabung = new Date().toISOString();
                await addDoc(collection(db, "pelanggan"), payload);
            }
            showCustomerForm.value = false;
        } catch (e) { alert("Error: " + e.message); }
    };

    const deleteCustomer = async (id) => { 
        if (confirm("Apakah Anda yakin ingin menghapus pelanggan ini?")) { 
            try { 
                await deleteDoc(doc(db, "pelanggan", id)); 
                showCustomerForm.value = false;
            } catch (e) { alert("Error: " + e.message); } 
        } 
    };

    const openCustomPrices = (c) => {
        selectedCustomer.value = c;
        tempPrices.value = {};
        (services.value || []).forEach(item => {
            const savedPrice = customPricesList.value.find(p => p.id_pelanggan === c.id && p.id_layanan === item.id);
            tempPrices.value[item.id] = savedPrice ? savedPrice.harga_custom : '';
        });
    };

    const saveCustomPrices = async () => {
        try {
            const cId = selectedCustomer.value.id;
            for (const k of Object.keys(tempPrices.value)) {
                const val = tempPrices.value[k], dId = `${cId}_${k}`;
                if (val !== '' && val !== null && val !== undefined) await setDoc(doc(db, "harga_khusus", dId), { id_pelanggan: cId, id_layanan: k, harga_custom: Number(val) });
                else await deleteDoc(doc(db, "harga_khusus", dId));
            }
            alert("Tarif khusus tersimpan!");
        } catch (e) { alert("Error: " + e.message); }
    };

    return {
        customers, customPricesList, searchQueryCustomers, showCustomerForm, isEditing, customerForm,
        selectedCustomer, tempPrices, filteredCustomers, getCustomerName, getCustomerAddress, getCustomerMarkup, getPrice,
        openAddCustomer, openEditCustomer, saveCustomer, deleteCustomer, openCustomPrices, saveCustomPrices
    };
}