import { db, doc, collection, addDoc, deleteDoc, onSnapshot } from "../firebase-db.js";

export function useTransaksi(customers, services, getPrice, getCustomerName) {
    const { ref, onMounted, computed } = Vue;
    const transactions = ref([]);
    const searchQueryTransactions = ref('');
    const showTransactionForm = ref(false);
    const trxForm = ref({ id_pelanggan: '', tanggal: '', items: [] });
    const itemSearchQuery = ref('');
    const selectedItemId = ref('');
    const selectedItemQty = ref('');

    onMounted(() => {
        onSnapshot(collection(db, "transaksi"), (snap) => {
            const list = []; snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
            transactions.value = list.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
        });
    });

    const formatDate = (ds) => { if (!ds) return '-'; if (ds.includes('T')) ds = ds.split('T')[0]; const p = ds.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ds; };

    const getCustomerUnbilledTotal = (custId) => {
        let total = 0;
        transactions.value.filter(t => t.id_pelanggan === custId && t.status_tagihan === 'belum_ditagih').forEach(t => {
            t.items.forEach(item => { total += Number(item.qty) * getPrice(custId, item.id_layanan); });
        });
        return total;
    };

    const hasUnbilledCustomers = computed(() => customers.value.some(c => getCustomerUnbilledTotal(c.id) > 0));
    const unbilledTransactionsCount = computed(() => transactions.value.filter(t => t.status_tagihan === 'belum_ditagih').length);

    const filteredTransactions = computed(() => {
        const q = searchQueryTransactions.value.toLowerCase().trim();
        return !q ? transactions.value : transactions.value.filter(t => getCustomerName(t.id_pelanggan).toLowerCase().includes(q));
    });

    const openAddTransaction = () => {
        trxForm.value = { id_pelanggan: '', tanggal: new Date().toISOString().split('T')[0], items: [] };
        itemSearchQuery.value = ''; selectedItemId.value = ''; selectedItemQty.value = ''; showTransactionForm.value = true;
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
        if (!trxForm.value.id_pelanggan || !trxForm.value.tanggal) { alert("Harap isi data."); return; }
        if (trxForm.value.items.length === 0) { alert("Isi minimal 1 item."); return; }
        try {
            await addDoc(collection(db, "transaksi"), { id_pelanggan: trxForm.value.id_pelanggan, tanggal: trxForm.value.tanggal, items: trxForm.value.items, status_tagihan: 'belum_ditagih' });
            alert("Transaksi tersimpan!"); showTransactionForm.value = false;
        } catch (e) { alert("Error: " + e.message); }
    };

    const deleteTransaction = async (id, status) => {
        if (status === 'sudah_ditagih') { alert("Sudah masuk invoice."); return; }
        if (confirm("Hapus transaksi?")) { try { await deleteDoc(doc(db, "transaksi", id)); } catch (e) { alert("Error: " + e.message); } }
    };

    return {
        transactions, searchQueryTransactions, showTransactionForm, trxForm, itemSearchQuery, selectedItemId, selectedItemQty,
        unbilledTransactionsCount, filteredTransactions, filteredSearchItems, formatDate, getCustomerUnbilledTotal, hasUnbilledCustomers,
        openAddTransaction, selectSearchItem, addTrxItem, removeTrxItem, saveTransaction, deleteTransaction
    };
}