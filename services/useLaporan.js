export function useLaporan(invoices, getCustomerName, formatMonthYear) {
    const { ref, computed } = Vue;
    const reportFilterClient = ref('');
    const reportFilterMonth = ref(new Date().toISOString().slice(0, 7));

    const reportInvoices = computed(() => {
        return invoices.value.filter(inv => (!reportFilterClient.value || inv.id_pelanggan === reportFilterClient.value) && (!reportFilterMonth.value || inv.periode === reportFilterMonth.value));
    });

    const reportTotals = computed(() => {
        let tO = 0, tT = 0, tP = 0;
        reportInvoices.value.forEach(inv => {
            const val = Number(inv.total_tagihan) || 0; tO += val;
            if (inv.status_pembayaran === 'lunas_cash' || inv.status_pembayaran === 'lunas_transfer') tT += val; else tP += val;
        });
        return { totalOmset: tO, totalTerbayar: tT, totalPiutang: tP };
    });

    const exportToExcel = () => {
        if (reportInvoices.value.length === 0) { alert("Tidak ada data."); return; }
        const data = reportInvoices.value.map(inv => ({
            "No. Invoice": inv.no_invoice, "Nama Klien": getCustomerName(inv.id_pelanggan), "Periode": formatMonthYear(inv.periode), "Total (IDR)": inv.total_tagihan, "Status": inv.status_pembayaran.replace('_', ' ')
        }));
        const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Laporan"); XLSX.writeFile(wb, `Omset_${reportFilterMonth.value}.xlsx`);
    };

    return { reportFilterClient, reportFilterMonth, reportInvoices, reportTotals, exportToExcel };
}