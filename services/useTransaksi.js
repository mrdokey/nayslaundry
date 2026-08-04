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
    const trxForm = ref({ id_pelanggan: '', tanggal: '', nama_tamu: '', nomor_kamar: '', no_nota: '', items: [] });
    
    const itemSearchQuery = ref('');
    const selectedItemId = ref('');
    const selectedItemQty = ref('');
    const selectedItemPrice = ref(0);

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
            t.items.forEach(item => { 
                const itemPrice = item.harga_satuan !== undefined ? Number(item.harga_satuan) : getPrice(custId, item.id_layanan);
                total += Number(item.qty) * itemPrice; 
            });
        });
        return total;
    };

    const hasUnbilledCustomers = computed(() => customers.value.some(c => getCustomerUnbilledTotal(c.id) > 0));
    const unbilledTransactionsCount = computed(() => transactions.value.filter(t => t.status_tagihan !== 'sudah_ditagih').length);

    const filteredTransactions = computed(() => {
        return transactions.value.filter(t => {
            const q = searchQueryTransactions.value.toLowerCase().trim();
            const noSj = (t.no_nota || '').toLowerCase();
            const matchName = !q || getCustomerName(t.id_pelanggan).toLowerCase().includes(q) || (t.nama_tamu && t.nama_tamu.toLowerCase().includes(q)) || noSj.includes(q);
            const isoDate = toIso(t.tanggal);
            const matchStart = !filterStartDate.value || isoDate >= filterStartDate.value;
            const matchEnd = !filterEndDate.value || isoDate <= filterEndDate.value;
            return matchName && matchStart && matchEnd;
        });
    });

    const openAddTransaction = () => {
        isEditingTrx.value = false;
        editingTrxId.value = '';
        trxForm.value = { id_pelanggan: '', tanggal: new Date().toISOString().split('T')[0], nama_tamu: '', nomor_kamar: '', no_nota: '', items: [] };
        itemSearchQuery.value = ''; selectedItemId.value = ''; selectedItemQty.value = ''; selectedItemPrice.value = 0;
        showTransactionForm.value = true;
    };

    const openEditTransaction = (t) => {
        isEditingTrx.value = true;
        editingTrxId.value = t.id;
        trxForm.value = {
            id_pelanggan: t.id_pelanggan,
            tanggal: t.tanggal,
            nama_tamu: t.nama_tamu || '',
            nomor_kamar: t.nomor_kamar || '',
            no_nota: t.no_nota || '',
            items: JSON.parse(JSON.stringify(t.items))
        };
        itemSearchQuery.value = ''; selectedItemId.value = ''; selectedItemQty.value = ''; selectedItemPrice.value = 0;
        showTransactionForm.value = true;
    };

    const filteredSearchItems = computed(() => {
        const q = itemSearchQuery.value.toLowerCase().trim();
        return !q ? services.value : services.value.filter(s => s.nama_layanan.toLowerCase().includes(q));
    });

    const selectSearchItem = (i) => { 
        selectedItemId.value = i.id; 
        itemSearchQuery.value = i.nama_layanan; 
        selectedItemPrice.value = getPrice(trxForm.value.id_pelanggan, i.id);
    };

    const addTrxItem = () => {
        if (!selectedItemId.value) { alert("Pilih item!"); return; }
        if (!selectedItemQty.value || Number(selectedItemQty.value) <= 0) { alert("Isi Qty!"); return; }
        
        const priceToUse = (selectedItemPrice.value !== '' && selectedItemPrice.value !== null) ? Number(selectedItemPrice.value) : getPrice(trxForm.value.id_pelanggan, selectedItemId.value);

        const ex = trxForm.value.items.find(x => x.id_layanan === selectedItemId.value);
        if (ex) {
            ex.qty += Number(selectedItemQty.value);
            ex.harga_satuan = priceToUse;
        } else {
            trxForm.value.items.push({ 
                id_layanan: selectedItemId.value, 
                qty: Number(selectedItemQty.value),
                harga_satuan: priceToUse
            });
        }
        selectedItemId.value = ''; selectedItemQty.value = ''; itemSearchQuery.value = ''; selectedItemPrice.value = 0;
    };

    const removeTrxItem = (idx) => { trxForm.value.items.splice(idx, 1); };

    const saveTransaction = async () => {
        if (!trxForm.value.id_pelanggan || !trxForm.value.tanggal) { alert("Harap isi data."); return; }
        if (trxForm.value.items.length === 0) { alert("Isi minimal 1 item."); return; }

        try {
            // Otomatisasi Pembuatan No. Surat Jalan (SJ) Unik jika Transaksi Baru
            let sjNumber = trxForm.value.no_nota;
            if (!isEditingTrx.value || !sjNumber) {
                const randomNum = Math.floor(100 + Math.random() * 900);
                const dateCode = trxForm.value.tanggal.replace(/-/g, '').slice(2); // YYYYMMDD -> YYMMDD
                sjNumber = `SJ/${dateCode}/${randomNum}`;
            }

            let savedData = {
                id_pelanggan: trxForm.value.id_pelanggan,
                tanggal: trxForm.value.tanggal,
                nama_tamu: trxForm.value.nama_tamu || '',
                nomor_kamar: trxForm.value.nomor_kamar || '',
                no_nota: sjNumber, // Menyimpan Nomor Surat Jalan
                items: trxForm.value.items,
                status_tagihan: isEditingTrx.value ? undefined : 'belum_ditagih'
            };

            if (isEditingTrx.value) {
                delete savedData.status_tagihan;
                await updateDoc(doc(db, "transaksi", editingTrxId.value), savedData);
                savedData.id = editingTrxId.value;
                alert("Transaksi berhasil diperbarui!");
            } else {
                const docRef = await addDoc(collection(db, "transaksi"), savedData);
                savedData.id = docRef.id;
                alert(`Transaksi disimpan dengan No. SJ: ${sjNumber}`);
            }

            showTransactionForm.value = false;

            if (confirm("Apakah Anda ingin langsung mencetak Nota Surat Jalan A5 untuk transaksi ini?")) {
                printA5Note(savedData);
            }
        } catch (e) { alert("Error: " + e.message); }
    };

    const deleteTransaction = async (id) => {
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
        showTransactionForm, isEditingTrx, editingTrxId, trxForm, itemSearchQuery, selectedItemId, selectedItemQty, selectedItemPrice,
        unbilledTransactionsCount, filteredTransactions, filteredSearchItems, formatDate, getCustomerUnbilledTotal, hasUnbilledCustomers, printA5Data,
        openAddTransaction, openEditTransaction, selectSearchItem, addTrxItem, removeTrxItem, saveTransaction, deleteTransaction, printA5Note
    };
}