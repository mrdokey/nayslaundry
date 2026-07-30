import { db, doc, collection, addDoc, updateDoc, deleteDoc, onSnapshot } from "../firebase-db.js";

export function useTagihan(transactions, getPrice, getServiceName, getServiceUnit, getCustomerName) {
    const { ref, onMounted, computed, watch } = Vue;
    const invoices = ref([]);
    const searchQueryInvoices = ref('');
    const showInvoiceForm = ref(false);
    const isEditingInvoice = ref(false);
    const editingInvoiceId = ref('');

    const invoiceForm = ref({ id_pelanggan: '', periode: '' });
    const selectedTrxIds = ref([]);
    const manualSubtotal = ref(0);
    const discountAmount = ref(0);
    const printData = ref(null);

    onMounted(() => {
        onSnapshot(collection(db, "tagihan"), (snap) => {
            const list = []; snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
            invoices.value = list.sort((a, b) => b.tanggal_buat.localeCompare(a.tanggal_buat));
        });
    });

    const formatMonthYear = (ms) => {
        if (!ms) return '-'; const p = ms.split('-');
        if (p.length === 2) { const m = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]; return `${m[parseInt(p[1]) - 1]} ${p[0]}`; }
        return ms;
    };

    const filteredInvoices = computed(() => {
        const q = searchQueryInvoices.value.toLowerCase().trim();
        return !q ? invoices.value : invoices.value.filter(inv => inv.no_invoice.toLowerCase().includes(q) || getCustomerName(inv.id_pelanggan).toLowerCase().includes(q));
    });

    // Pengelompokan Tagihan: Belum Lunas vs Sudah Lunas
    const unpaidInvoices = computed(() => filteredInvoices.value.filter(inv => inv.status_pembayaran === 'belum_lunas'));
    const paidInvoices = computed(() => filteredInvoices.value.filter(inv => inv.status_pembayaran === 'lunas_cash' || inv.status_pembayaran === 'lunas_transfer'));

    // Mengambil transaksi harian yang tersedia untuk dicentang
    const availableTrxForDraft = computed(() => {
        const custId = invoiceForm.value.id_pelanggan;
        const period = invoiceForm.value.periode;
        if (!custId || !period) return [];

        return transactions.value.filter(t => {
            const matchCust = t.id_pelanggan === custId;
            const matchMonth = t.tanggal.startsWith(period);
            const matchStatus = t.status_tagihan !== 'sudah_ditagih' || (isEditingInvoice.value && selectedTrxIds.value.includes(t.id));
            return matchCust && matchMonth && matchStatus;
        });
    });

    // Menghitung draf item terakumulasi HANYA dari transaksi yang DICENTANG
    const draftInvoiceItems = computed(() => {
        const custId = invoiceForm.value.id_pelanggan;
        if (!custId || selectedTrxIds.value.length === 0) return [];

        const selectedTrxList = availableTrxForDraft.value.filter(t => selectedTrxIds.value.includes(t.id));
        const mapItems = {};

        selectedTrxList.forEach(t => {
            t.items.forEach(item => {
                if (!mapItems[item.id_layanan]) mapItems[item.id_layanan] = 0;
                mapItems[item.id_layanan] += Number(item.qty);
            });
        });

        const list = [];
        for (const k of Object.keys(mapItems)) {
            const qty = mapItems[k];
            const p = getPrice(custId, k);
            list.push({
                id_layanan: k,
                nama_layanan: getServiceName(k),
                satuan: getServiceUnit(k),
                qty: qty,
                harga_satuan: p,
                subtotal: qty * p
            });
        }
        return list;
    });

    // Subtotal murni terhitung dari sistem
    const calculatedSubtotal = computed(() => {
        return draftInvoiceItems.value.reduce((acc, i) => acc + i.subtotal, 0);
    });

    // Total Akhir = Subtotal Penyesuaian - Diskon
    const grandTotal = computed(() => {
        const sub = Number(manualSubtotal.value) || 0;
        const disc = Number(discountAmount.value) || 0;
        return Math.max(0, sub - disc);
    });

    // Sinkronisasi otomatis subtotal awal jika centang berubah
    watch(calculatedSubtotal, (newSub) => {
        if (!isEditingInvoice.value) {
            manualSubtotal.value = newSub;
        }
    });

    const openAddInvoice = () => {
        isEditingInvoice.value = false;
        editingInvoiceId.value = '';
        const currentMonth = new Date().toISOString().slice(0, 7);
        invoiceForm.value = { id_pelanggan: '', periode: currentMonth };
        selectedTrxIds.value = [];
        manualSubtotal.value = 0;
        discountAmount.value = 0;
        showInvoiceForm.value = true;
    };

    const openEditInvoice = (inv) => {
        isEditingInvoice.value = true;
        editingInvoiceId.value = inv.id;
        invoiceForm.value = { id_pelanggan: inv.id_pelanggan, periode: inv.periode };
        manualSubtotal.value = inv.subtotal_penyesuaian !== undefined ? inv.subtotal_penyesuaian : inv.total_tagihan;
        discountAmount.value = inv.diskon || 0;
        
        selectedTrxIds.value = transactions.value
            .filter(t => t.id_pelanggan === inv.id_pelanggan && t.tanggal.startsWith(inv.periode))
            .map(t => t.id);
        
        showInvoiceForm.value = true;
    };

    const selectAllTrx = () => {
        selectedTrxIds.value = availableTrxForDraft.value.map(t => t.id);
        manualSubtotal.value = calculatedSubtotal.value;
    };

    const deselectAllTrx = () => {
        selectedTrxIds.value = [];
        manualSubtotal.value = 0;
    };

    const saveInvoice = async () => {
        if (selectedTrxIds.value.length === 0 && draftInvoiceItems.value.length === 0) {
            alert("Harap pilih minimal satu transaksi."); return;
        }

        try {
            let savedData = {
                id_pelanggan: invoiceForm.value.id_pelanggan,
                periode: invoiceForm.value.periode,
                subtotal_awal: calculatedSubtotal.value,
                subtotal_penyesuaian: Number(manualSubtotal.value),
                diskon: Number(discountAmount.value),
                total_tagihan: grandTotal.value,
                items: draftInvoiceItems.value
            };

            if (isEditingInvoice.value) {
                await updateDoc(doc(db, "tagihan", editingInvoiceId.value), savedData);
                savedData.id = editingInvoiceId.value;
                const existingInv = invoices.value.find(i => i.id === editingInvoiceId.value);
                savedData.no_invoice = existingInv ? existingInv.no_invoice : 'INV';
                savedData.tanggal_buat = existingInv ? existingInv.tanggal_buat : new Date().toISOString();
                alert("Invoice berhasil diperbarui!");
            } else {
                const randomId = Math.floor(100 + Math.random() * 900);
                const cleanPeriod = invoiceForm.value.periode.replace('-', '');
                savedData.no_invoice = `INV/${cleanPeriod}/${randomId}`;
                savedData.tanggal_buat = new Date().toISOString();
                savedData.status_pembayaran = 'belum_lunas';

                const docRef = await addDoc(collection(db, "tagihan"), savedData);
                savedData.id = docRef.id;

                // Tandai transaksi yang dicentang sebagai 'sudah_ditagih'
                const batchTrx = selectedTrxIds.value.map(id => updateDoc(doc(db, "transaksi", id), { status_tagihan: 'sudah_ditagih' }));
                await Promise.all(batchTrx);

                alert("Tagihan bulanan berhasil diterbitkan!");
            }

            showInvoiceForm.value = false;

            // POP-UP OTOMATIS: Penawaran Cetak Invoice PDF Langsung
            if (confirm("Apakah Anda ingin langsung mencetak/mengunduh Invoice PDF ini?")) {
                printInvoice(savedData);
            }
        } catch (e) { alert("Error: " + e.message); }
    };

    const deleteInvoice = async (id) => {
        if (confirm("Apakah Anda yakin ingin menghapus invoice ini?")) {
            try {
                await deleteDoc(doc(db, "tagihan", id));
                showInvoiceForm.value = false;
            } catch (e) { alert("Error: " + e.message); }
        }
    };

    const updatePaymentStatus = async (id, ns) => {
        try { await updateDoc(doc(db, "tagihan", id), { status_pembayaran: ns }); } catch (e) { alert("Error: " + e.message); }
    };

    const printInvoice = (inv) => {
        printData.value = inv;
        setTimeout(() => { window.print(); }, 300);
    };

    return {
        invoices, searchQueryInvoices, showInvoiceForm, isEditingInvoice, editingInvoiceId, invoiceForm,
        selectedTrxIds, manualSubtotal, discountAmount, printData, availableTrxForDraft, draftInvoiceItems,
        calculatedSubtotal, grandTotal, unpaidInvoices, paidInvoices, filteredInvoices, formatMonthYear,
        openAddInvoice, openEditInvoice, selectAllTrx, deselectAllTrx, saveInvoice, deleteInvoice, updatePaymentStatus, printInvoice
    };
}