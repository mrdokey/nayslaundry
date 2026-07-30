import { db, doc, collection, addDoc, updateDoc, deleteDoc, onSnapshot } from "../firebase-db.js";

export function useTagihan(transactions, getPrice, getServiceName, getServiceUnit, getCustomerName) {
    const { ref, onMounted, computed } = Vue;
    const invoices = ref([]);
    const searchQueryInvoices = ref('');
    const showInvoiceForm = ref(false);
    const invoiceForm = ref({ id_pelanggan: '', periode: '' });
    const draftInvoiceItems = ref([]);
    const draftInvoiceTotal = ref(0);
    const draftTrxIds = ref([]);
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

    const openAddInvoice = () => {
        invoiceForm.value = { id_pelanggan: '', periode: new Date().toISOString().slice(0, 7) };
        draftInvoiceItems.value = []; draftInvoiceTotal.value = 0; draftTrxIds.value = []; showInvoiceForm.value = true;
    };

    const calculateDraftInvoice = () => {
        const cId = invoiceForm.value.id_pelanggan, period = invoiceForm.value.periode;
        if (!cId || !period) { draftInvoiceItems.value = []; draftInvoiceTotal.value = 0; draftTrxIds.value = []; return; }
        const flt = transactions.value.filter(t => t.id_pelanggan === cId && t.status_tagihan === 'belum_ditagih' && t.tanggal.startsWith(period));
        const mapItems = {}, tIds = [];
        flt.forEach(t => { tIds.push(t.id); t.items.forEach(i => { mapItems[i.id_layanan] = (mapItems[i.id_layanan] || 0) + i.qty; }); });
        const list = []; let gTotal = 0;
        for (const k of Object.keys(mapItems)) {
            const qty = mapItems[k], p = getPrice(cId, k), sub = qty * p;
            list.push({ id_layanan: k, nama_layanan: getServiceName(k), satuan: getServiceUnit(k), qty, harga_satuan: p, subtotal: sub });
            gTotal += sub;
        }
        draftInvoiceItems.value = list; draftInvoiceTotal.value = gTotal; draftTrxIds.value = tIds;
    };

    const saveInvoice = async () => {
        if (draftInvoiceItems.value.length === 0) { alert("Draf kosong."); return; }
        try {
            const rId = Math.floor(100 + Math.random() * 900), noInv = `INV/${invoiceForm.value.periode.replace('-', '')}/${rId}`;
            await addDoc(collection(db, "tagihan"), {
                no_invoice: noInv, id_pelanggan: invoiceForm.value.id_pelanggan, periode: invoiceForm.value.periode,
                tanggal_buat: new Date().toISOString(), total_tagihan: draftInvoiceTotal.value, status_pembayaran: 'belum_lunas', items: draftInvoiceItems.value
            });
            await Promise.all(draftTrxIds.value.map(id => updateDoc(doc(db, "transaksi", id), { status_tagihan: 'sudah_ditagih' })));
            alert("Tagihan terbit!"); showInvoiceForm.value = false;
        } catch (e) { alert("Error: " + e.message); }
    };

    const deleteInvoice = async (id) => { if (confirm("Hapus tagihan?")) { try { await deleteDoc(doc(db, "tagihan", id)); } catch (e) { alert("Error: " + e.message); } } };
    const updatePaymentStatus = async (id, ns) => { try { await updateDoc(doc(db, "tagihan", id), { status_pembayaran: ns }); } catch (e) { alert("Error: " + e.message); } };
    const printInvoice = (inv) => { printData.value = inv; setTimeout(() => { window.print(); }, 300); };

    return {
        invoices, searchQueryInvoices, showInvoiceForm, invoiceForm, draftInvoiceItems, draftInvoiceTotal, printData,
        filteredInvoices, formatMonthYear, openAddInvoice, calculateDraftInvoice, saveInvoice, deleteInvoice, updatePaymentStatus, printInvoice
    };
}