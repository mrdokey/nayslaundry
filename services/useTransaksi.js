import { db, doc, collection, addDoc, updateDoc, deleteDoc, onSnapshot } from "../firebase-db.js";

export function useTransaksi(customers, services, getPrice, getCustomerName) {
    const { ref, onMounted, computed } = Vue;
    const transactions = ref([]);
    const searchQueryTransactions = ref('');
    const filterStartDate = ref('');
    const filterEndDate = ref('');
    
    const showTransactionForm = ref(false);
    const isEditingTrx = ref(false);
    const editingTrxId = ref('');
    const trxForm = ref({ id_pelanggan: '', tanggal: '', items: [] });
    
    const itemSearchQuery = ref('');
    const selectedItemId = ref('');
    const selectedItemQty = ref('');

    // State cetak Nota A5
    const printA5Data = ref(null);

    onMounted(() => {
        onSnapshot(collection(db, "transaksi"), (snap) => {
            const list = []; snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
            transactions.value = list.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
        });
    });

    const formatDate = (ds) => { 
        if (!ds) return '-'; 
        if (ds.includes('T')) ds = ds.split('T')[0]; 
        const p = ds.split('-'); 
        return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ds; 
    };

    // Helper konversi tanggal ISO presisi dengan digit padding (YYYY-MM-DD)
    const toIso = (ds) => {
        if (!ds) return '';
        if (ds.includes('/')) {
            const p = ds.split('/');
            return p.length === 3 ? `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}` : ds;
        } else if (ds.includes('-')) {
            const p = ds.split('-');
            return p.length === 3 ? `${p[0]}-${p[1].padStart(2,'0')}-${p[2].padStart(2,'0')}` : ds;
        }
        return ds;
    };

    const getCustomerUnbilledTotal = (custId) => {
        let total = 0;
        transactions.value.filter(t => t.id_pelanggan === custId && t.status_tagihan !== 'sudah_ditagih').forEach(t => {
            t.items.forEach(item => { total += Number(item.qty) * getPrice(custId, item.id_layanan); });
        });
        return total;
    };

    const hasUnbilledCustomers = computed(() => customers.value.some(c => getCustomerUnbilledTotal(c.id) > 0));
    const unbilledTransactionsCount = computed(() => transactions.value.filter(t => t.status_tagihan !== 'sudah_ditagih').length);

    // Filter Nama + Rentang Tanggal
    const filteredTransactions = computed(() => {
        return transactions.value.filter(t => {
            const q = searchQueryTransactions.value.toLowerCase().trim();
            const matchName = !q || getCustomerName(t.id_pelanggan).toLowerCase().includes(q);
            const isoDate = toIso(t.tanggal);
            const matchStart = !filterStartDate.value || isoDate >= filterStartDate.value;
            const matchEnd = !filterEndDate.value || isoDate <= filterEndDate.value;
            return matchName && matchStart && matchEnd;
        });
    });

    // Pengelompokan Transaksi (Belum Ditagih & Sudah Ditagih)
    // PERBAIKAN: Menggunakan !== 'sudah_ditagih' agar data transaksi lama otomatis muncul di Belum Ditagih
    const unbilledTransactions = computed(() => filteredTransactions.value.filter(t => t.status_tagihan !== 'sudah_ditagih'));
    const billedTransactions = computed(() => filteredTransactions.value.filter(t => t.status_tagihan === 'sudah_ditagih'));

    const openAddTransaction = () => {
        isEditingTrx.value = false;
        editingTrxId.value = '';
        trxForm.value = { id_pelanggan: '', tanggal: new Date().toISOString().split('T')[0], items: [] };
        itemSearchQuery.value = ''; selectedItemId.value = ''; selectedItemQty.value = ''; 
        showTransactionForm.value = true;
    };

    const openEditTransaction = (t) => {
        isEditingTrx.value = true;
        editingTrxId.value = t.id;
        trxForm.value = {
            id_pelanggan: t.id_pelanggan,
            tanggal: t.tanggal,
            items: JSON.parse(JSON.stringify(t.items)) // Clone items array
        };
        itemSearchQuery.value = ''; selectedItemId.value = ''; selectedItemQty.value = ''; 
        showTransactionForm.value = true;
    };

    const filteredSearchItems = computed(() => {
        const q = itemSearchQuery.value.toLowerCase().trim();
        return !q ? services.value : services.value.filter(s => s.nama_layanan.toLowerCase().includes(q));
    });

    const selectSearchItem = (i) => { selectedItemId.value = i.id; itemSearchQuery.value = i.nama_layanan; };

    const addTrxItem = () => {
        if (!selectedItemId.value) { alert("Pilih item!"); return; }
        if (!selectedItemQty.value || Number(selectedItemQty.value) <= 0) { alert("Isi Qty!"); return; }
        const ex = trxForm.value.items.find(x => x.id_layanan === selectedItemId.value);
        if (ex) ex.qty += Number(selectedItemQty.value);
        else trxForm.value.items.push({ id_layanan: selectedItemId.value, qty: Number(selectedItemQty.value) });
        selectedItemId.value = ''; selectedItemQty.value = ''; itemSearchQuery.value = '';
    };

    const removeTrxItem = (idx) => { trxForm.value.items.splice(idx, 1); };

    const saveTransaction = async () => {
        if (!trxForm.value.id_pelanggan || !trxForm.value.tanggal) { 
            alert("Harap pilih pelanggan dan tanggal."); 
            return; 
        }
        if (trxForm.value.items.length === 0) { 
            alert("Harap masukkan minimal satu item ke daftar."); 
            return; 
        }

        try {
            let savedData = {
                id_pelanggan: trxForm.value.id_pelanggan,
                tanggal: trxForm.value.tanggal,
                items: trxForm.value.items,
                status_tagihan: 'belum_ditagih'
            };

            if (isEditingTrx.value) {
                await updateDoc(doc(db, "transaksi", editingTrxId.value), savedData);
                savedData.id = editingTrxId.value;
                alert("Transaksi berhasil diperbarui!");
            } else {
                const docRef = await addDoc(collection(db, "transaksi"), savedData);
                savedData.id = docRef.id;
                alert("Transaksi berhasil disimpan!");
            }

            showTransactionForm.value = false;

            if (confirm("Apakah Anda ingin langsung mencetak Nota Surat Jalan A5 untuk transaksi ini?")) {
                printA5Note(savedData);
            }

        } catch (e) { 
            alert("Gagal menyimpan transaksi: " + e.message); 
        }
    };

    const deleteTransaction = async (id, status) => {
        if (status === 'sudah_ditagih') { alert("Transaksi yang sudah masuk invoice bulanan tidak dapat dihapus."); return; }
        if (confirm("Apakah Anda yakin ingin menghapus catatan transaksi ini?")) {
            try { 
                await deleteDoc(doc(db, "transaksi", id)); 
                showTransactionForm.value = false;
            } catch (e) { alert("Error: " + e.message); }
        }
    };

    const printA5Note = (t) => {
        printA5Data.value = t;
        setTimeout(() => { window.print(); }, 300);
    };

    return {
        transactions, searchQueryTransactions, filterStartDate, filterEndDate,
        showTransactionForm, isEditingTrx, editingTrxId, trxForm, itemSearchQuery, selectedItemId, selectedItemQty,
        unbilledTransactionsCount, filteredTransactions, unbilledTransactions, billedTransactions,
        filteredSearchItems, formatDate, getCustomerUnbilledTotal, hasUnbilledCustomers, printA5Data,
        openAddTransaction, openEditTransaction, selectSearchItem, addTrxItem, removeTrxItem, saveTransaction, deleteTransaction, printA5Note
    };
}