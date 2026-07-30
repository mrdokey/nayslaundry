export default {
    name: 'InvoicePrintView',
    props: ['printData', 'printA5Data', 'profile', 'getCustomerName', 'getCustomerAddress', 'getServiceName', 'getServiceUnit', 'formatDate', 'formatMonthYear'],
    template: `
        <div>
            <!-- 1. DOKUMEN INVOICE BULANAN (A4) -->
            <div v-if="printData" class="hidden print:block w-full max-w-4xl p-6 bg-white text-black text-sm">
                <!-- Kop Surat dengan Alamat Rapat -->
                <div class="flex justify-between items-start border-b-2 border-indigo-900 pb-3 mb-4">
                    <div class="flex items-center space-x-3">
                        <img v-if="profile.logo_url" :src="profile.logo_url" class="w-14 h-14 object-cover rounded-full bg-slate-50 p-1 shrink-0">
                        <div class="leading-tight">
                            <h1 class="text-xl font-bold text-indigo-900 uppercase tracking-wide leading-none mb-1">{{ profile.nama_laundry || 'Nays Laundry' }}</h1>
                            <p class="text-[10px] text-slate-600 whitespace-pre-line leading-tight">{{ profile.alamat }}</p>
                            <p class="text-[10px] text-slate-600 leading-tight">Telp: {{ profile.no_telepon }}</p>
                        </div>
                    </div>
                    <div class="text-right leading-tight">
                        <h2 class="text-2xl font-extrabold text-slate-300 tracking-wider">INVOICE</h2>
                        <p class="text-[10px] text-slate-700 mt-1">Nomor: {{ printData.no_invoice }}</p>
                        <p class="text-[10px] text-slate-400">Tanggal: {{ formatDate(printData.tanggal_buat) }}</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <h3 class="text-[10px] font-bold text-indigo-900 uppercase mb-0.5">Bill To:</h3>
                        <p class="font-bold text-slate-800 text-sm leading-none">{{ getCustomerName(printData.id_pelanggan) }}</p>
                        <p class="text-[10px] text-slate-600 mt-0.5">{{ getCustomerAddress(printData.id_pelanggan) }}</p>
                    </div>
                    <div class="text-right">
                        <h3 class="text-[10px] font-bold text-indigo-900 uppercase mb-0.5">Periode:</h3>
                        <p class="font-bold text-slate-800 text-sm leading-none">{{ formatMonthYear(printData.periode) }}</p>
                        <p class="text-[10px] text-slate-500 mt-0.5">Payment Method: Cash / Transfer</p>
                    </div>
                </div>

                <table class="w-full text-left border-collapse border border-slate-200 text-xs mb-4">
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
                            <td colspan="4" class="p-2.5 text-right text-indigo-900 border">TOTAL TAGIHAN:</td>
                            <td class="p-2.5 text-right text-indigo-900 border">Rp {{ printData.total_tagihan.toLocaleString() }}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="grid grid-cols-2 gap-4 mt-6 pt-3 border-t border-slate-100">
                    <div>
                        <h4 class="text-[10px] font-bold text-indigo-900 uppercase mb-0.5">Informasi Rekening Pembayaran:</h4>
                        <p class="text-xs text-slate-800 font-semibold leading-relaxed">
                            Bank: {{ profile.bank_cabang || '-' }}<br>
                            No. Rekening: {{ profile.bank_nomor || '-' }}<br>
                            A/N: {{ profile.bank_nama || '-' }}
                        </p>
                    </div>
                    <div class="text-center flex flex-col justify-end items-center">
                        <p class="text-[10px] text-slate-400 mb-8">Hormat Kami,</p>
                        <p class="font-bold text-indigo-900 border-t border-slate-300 pt-0.5 px-6 uppercase">{{ profile.nama_laundry || 'Nays Laundry' }}</p>
                    </div>
                </div>

                <div v-if="profile.tos" class="mt-6 border-t pt-3 text-[8px] text-slate-400 leading-tight">
                    <p class="font-bold text-slate-500 mb-0.5">Syarat & Ketentuan (Terms of Service):</p>
                    <p class="whitespace-pre-line pl-2">{{ profile.tos }}</p>
                </div>
            </div>

            <!-- 2. DOKUMEN NOTA SURAT JALAN HARIAN (A5) -->
            <div v-if="printA5Data" class="hidden print:block w-full max-w-2xl p-4 bg-white text-black text-xs">
                <!-- Kop Rapat A5 -->
                <div class="flex justify-between items-start border-b-2 border-indigo-900 pb-2 mb-3">
                    <div class="flex items-center space-x-2">
                        <img v-if="profile.logo_url" :src="profile.logo_url" class="w-10 h-10 object-cover rounded-full bg-slate-50 p-0.5 shrink-0">
                        <div class="leading-tight">
                            <h1 class="text-base font-bold text-indigo-900 uppercase leading-none">{{ profile.nama_laundry || 'Nays Laundry' }}</h1>
                            <p class="text-[9px] text-slate-600 whitespace-pre-line leading-tight">{{ profile.alamat }}</p>
                            <p class="text-[9px] text-slate-600 leading-tight">Telp: {{ profile.no_telepon }}</p>
                        </div>
                    </div>
                    <div class="text-right leading-tight">
                        <h2 class="text-base font-extrabold text-slate-700 tracking-wider">SURAT JALAN / NOTA</h2>
                        <p class="text-[9px] text-slate-500 mt-0.5">Tgl: {{ formatDate(printA5Data.tanggal) }}</p>
                    </div>
                </div>

                <div class="mb-3">
                    <p class="text-[10px]"><span class="font-bold text-indigo-900">Pelanggan:</span> <strong class="text-sm text-slate-800">{{ getCustomerName(printA5Data.id_pelanggan) }}</strong></p>
                    <p class="text-[9px] text-slate-500">{{ getCustomerAddress(printA5Data.id_pelanggan) }}</p>
                </div>

                <table class="w-full text-left border-collapse border border-slate-300 text-[10px] mb-4">
                    <thead>
                        <tr class="bg-indigo-900 text-white font-semibold">
                            <th class="p-1.5 border">No.</th>
                            <th class="p-1.5 border">Nama Item Linen / Cucian</th>
                            <th class="p-1.5 border text-center">Satuan</th>
                            <th class="p-1.5 border text-center w-20">Kuantitas (Qty)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(item, idx) in printA5Data.items" :key="item.id_layanan">
                            <td class="p-1.5 border text-center">{{ idx + 1 }}</td>
                            <td class="p-1.5 border font-semibold text-slate-800">{{ getServiceName(item.id_layanan) }}</td>
                            <td class="p-1.5 border text-center text-slate-600">{{ getServiceUnit(item.id_layanan) }}</td>
                            <td class="p-1.5 border text-center font-bold text-slate-900 text-xs">{{ item.qty }}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="grid grid-cols-2 gap-4 mt-6 text-center text-[10px]">
                    <div>
                        <p class="text-slate-500 mb-8">Penerima (Hotel/Vila),</p>
                        <p class="border-t border-slate-400 pt-0.5 inline-block px-6">( ............................ )</p>
                    </div>
                    <div>
                        <p class="text-slate-500 mb-8">Petugas / Driver,</p>
                        <p class="border-t border-slate-400 pt-0.5 inline-block px-6">( ............................ )</p>
                    </div>
                </div>
            </div>
        </div>
    `
};