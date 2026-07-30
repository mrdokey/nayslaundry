export default {
    name: 'InvoicePrintView',
    props: ['printData', 'profile', 'getCustomerName', 'getCustomerAddress', 'formatDate', 'formatMonthYear'],
    template: `
        <div class="hidden print:block w-full max-w-4xl p-8 bg-white text-black text-sm">
            <div class="flex justify-between items-start border-b-2 border-indigo-900 pb-5 mb-6">
                <div class="flex items-center space-x-3">
                    <img v-if="profile.logo_url" :src="profile.logo_url" class="w-14 h-16 object-cover rounded-full bg-slate-50 p-1">
                    <div>
                        <h1 class="text-xl font-bold text-indigo-900 uppercase leading-none">{{ profile.nama_laundry || 'Nays Laundry' }}</h1>
                        <p class="text-[10px] text-slate-500 mt-1 whitespace-pre-line">{{ profile.alamat }}</p>
                        <p class="text-[10px] text-slate-500">Telp: {{ profile.no_telepon }}</p>
                    </div>
                </div>
                <div class="text-right">
                    <h2 class="text-2xl font-extrabold text-slate-300 tracking-wider">INVOICE</h2>
                    <p class="text-[10px] text-slate-700 mt-0.5">Nomor: {{ printData.no_invoice }}</p>
                    <p class="text-[10px] text-slate-400">Tanggal: {{ formatDate(printData.tanggal_buat) }}</p>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <h3 class="text-[10px] font-bold text-indigo-900 uppercase mb-1">Bill To:</h3>
                    <p class="font-bold text-slate-800 text-base leading-none">{{ getCustomerName(printData.id_pelanggan) }}</p>
                    <p class="text-[10px] text-slate-600 mt-1">{{ getCustomerAddress(printData.id_pelanggan) }}</p>
                </div>
                <div class="text-right">
                    <h3 class="text-[10px] font-bold text-indigo-900 uppercase mb-1">Periode:</h3>
                    <p class="font-bold text-slate-800 text-base leading-none">{{ formatMonthYear(printData.periode) }}</p>
                    <p class="text-[10px] text-slate-500 mt-1">Payment Method: Cash / Transfer</p>
                </div>
            </div>

            <table class="w-full text-left border-collapse border border-slate-200 text-xs mb-6">
                <thead>
                    <tr class="bg-indigo-900 text-white font-semibold">
                        <th class="p-2 border">Deskripsi Item Laundry</th>
                        <th class="p-2 border text-center">Satuan</th>
                        <th class="p-2 border text-center">Qty</th>
                        <th class="p-2 border text-right">Harga Satuan</th>
                        <th class="p-2 border text-right">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="item in printData.items" :key="item.id_layanan">
                        <td class="p-2 font-semibold text-slate-800 border">{{ item.nama_layanan }}</td>
                        <td class="p-2 text-center text-slate-600 border">{{ item.satuan }}</td>
                        <td class="p-2 text-center font-bold text-slate-800 border">{{ item.qty }}</td>
                        <td class="p-2 text-right text-slate-600 border">Rp {{ item.harga_satuan.toLocaleString() }}</td>
                        <td class="p-2 text-right font-bold text-slate-800 border">Rp {{ item.subtotal.toLocaleString() }}</td>
                    </tr>
                    <tr class="bg-slate-50 font-bold text-xs">
                        <td colspan="4" class="p-3 text-right text-indigo-900 border">TOTAL TAGIHAN:</td>
                        <td class="p-3 text-right text-indigo-900 border">Rp {{ printData.total_tagihan.toLocaleString() }}</td>
                    </tr>
                </tbody>
            </table>

            <div class="grid grid-cols-2 gap-4 mt-8 pt-4 border-t border-slate-100">
                <div>
                    <h4 class="text-[10px] font-bold text-indigo-900 uppercase mb-0.5">Informasi Rekening Pembayaran:</h4>
                    <p class="text-xs text-slate-800 font-semibold leading-relaxed">
                        Bank: {{ profile.bank_cabang || '-' }}<br>
                        No. Rekening: {{ profile.bank_nomor || '-' }}<br>
                        A/N: {{ profile.bank_nama || '-' }}
                    </p>
                </div>
                <div class="text-center flex flex-col justify-end items-center">
                    <p class="text-[10px] text-slate-400 mb-10">Hormat Kami,</p>
                    <p class="font-bold text-indigo-900 border-t border-slate-300 pt-0.5 px-6 uppercase">{{ profile.nama_laundry || 'Nays Laundry' }}</p>
                </div>
            </div>

            <div v-if="profile.tos" class="mt-8 border-t pt-4 text-[8px] text-slate-400 leading-tight">
                <p class="font-bold text-slate-500 mb-1">Syarat & Ketentuan (Terms of Service):</p>
                <p class="whitespace-pre-line pl-2">{{ profile.tos }}</p>
            </div>
        </div>
    `
};