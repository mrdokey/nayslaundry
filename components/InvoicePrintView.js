export default {
    name: 'InvoicePrintView',
    props: ['printData', 'printA5Data', 'profile', 'getCustomerName', 'getCustomerAddress', 'getCustomerMarkup', 'getServiceName', 'getServiceUnit', 'getPrice', 'formatDate', 'formatMonthYear'],
    setup(props) {
        const calculateA5Total = (items, custId, isGuestMarkup = false) => {
            if (!items) return 0;
            const markup = isGuestMarkup ? (props.getCustomerMarkup ? props.getCustomerMarkup(custId) : 0) : 0;

            return items.reduce((acc, item) => {
                const basePrice = item.harga_satuan !== undefined ? Number(item.harga_satuan) : (props.getPrice ? props.getPrice(custId, item.id_layanan) : 0);
                const finalPrice = Math.round(basePrice * (1 + (markup / 100)));
                return acc + (Number(item.qty) * finalPrice);
            }, 0);
        };

        const getItemPriceA5 = (item, custId, isGuestMarkup = false) => {
            const markup = isGuestMarkup ? (props.getCustomerMarkup ? props.getCustomerMarkup(custId) : 0) : 0;
            const basePrice = item.harga_satuan !== undefined ? Number(item.harga_satuan) : (props.getPrice ? props.getPrice(custId, item.id_layanan) : 0);
            return Math.round(basePrice * (1 + (markup / 100)));
        };

        return { calculateA5Total, getItemPriceA5 };
    },
    template: `
        <div>
            <!-- 1. DOKUMEN INVOICE BULANAN (A4) -->
            <div v-if="printData" class="hidden print:block w-full max-w-4xl p-6 bg-white text-black text-xs print-page">
                <!-- Kop Surat -->
                <div class="flex justify-between items-start border-b-2 border-indigo-900 pb-3 mb-4">
                    <div class="flex items-center space-x-3">
                        <img v-if="profile.logo_url" :src="profile.logo_url" class="w-12 h-12 object-cover rounded-full bg-slate-50 p-0.5 shrink-0">
                        <div class="leading-tight">
                            <h1 class="text-lg font-bold text-indigo-900 uppercase tracking-wide leading-none mb-1">{{ profile.nama_laundry || 'Nays Laundry' }}</h1>
                            <p class="text-[10px] text-slate-600 whitespace-pre-line leading-tight">{{ profile.alamat }}</p>
                            <p class="text-[10px] text-slate-600 leading-tight">Telp: {{ profile.no_telepon }}</p>
                        </div>
                    </div>
                    <div class="text-right leading-tight">
                        <h2 class="text-xl font-extrabold text-slate-300 tracking-wider">INVOICE</h2>
                        <p class="text-[10px] text-slate-700 mt-1">Nomor: {{ printData.no_invoice }}</p>
                        <p class="text-[10px] text-slate-400">Tanggal: {{ formatDate(printData.tanggal_buat) }}</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <h3 class="text-[10px] font-bold text-indigo-900 uppercase mb-0.5">Bill To:</h3>
                        <p class="font-bold text-slate-800 text-xs leading-none">{{ getCustomerName(printData.id_pelanggan) }}</p>
                        <p class="text-[10px] text-slate-600 mt-0.5">{{ getCustomerAddress(printData.id_pelanggan) }}</p>
                    </div>
                    <div class="text-right">
                        <h3 class="text-[10px] font-bold text-indigo-900 uppercase mb-0.5">Periode:</h3>
                        <p class="font-bold text-slate-800 text-xs leading-none">{{ formatMonthYear(printData.periode) }}</p>
                        <p class="text-[10px] text-slate-500 mt-0.5">Payment Method: Cash / Transfer</p>
                    </div>
                </div>

                <table class="w-full text-left border-collapse border border-slate-200 text-[11px] mb-4">
                    <thead>
                        <tr class="bg-indigo-900 text-white font-semibold text-[10px]">
                            <th class="p-1.5 border border-slate-200 text-center">Tanggal</th>
                            <th class="p-1.5 border border-slate-200">Deskripsi Item Laundry</th>
                            <th class="p-1.5 border border-slate-200 text-center">Satuan</th>
                            <th class="p-1.5 border border-slate-200 text-center">Qty</th>
                            <th class="p-1.5 border border-slate-200 text-right">Harga Satuan</th>
                            <th class="p-1.5 border border-slate-200 text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(item, idx) in printData.items" :key="idx" class="even:bg-slate-50/50">
                            <td class="p-1.5 border border-slate-200 text-center text-slate-500 text-[10px]">{{ formatDate(item.tanggal) }}</td>
                            <td class="p-1.5 border border-slate-200 font-semibold text-slate-800">{{ item.nama_layanan }}</td>
                            <td class="p-1.5 border border-slate-200 text-center text-slate-600">{{ item.satuan }}</td>
                            <td class="p-1.5 border border-slate-200 text-center font-bold text-slate-800">{{ item.qty }}</td>
                            <td class="p-1.5 border border-slate-200 text-right text-slate-600">Rp {{ (item.harga_satuan || 0).toLocaleString() }}</td>
                            <td class="p-1.5 border border-slate-200 text-right font-bold text-slate-800">Rp {{ (item.subtotal || 0).toLocaleString() }}</td>
                        </tr>
                        <tr v-if="printData.diskon && printData.diskon > 0" class="bg-slate-50 font-semibold text-xs">
                            <td colspan="5" class="p-1.5 text-right text-slate-600 border">Subtotal Tagihan:</td>
                            <td class="p-1.5 text-right text-slate-800 border">Rp {{ (printData.subtotal_penyesuaian || printData.subtotal_awal || printData.total_tagihan).toLocaleString() }}</td>
                        </tr>
                        <tr v-if="printData.diskon && printData.diskon > 0" class="bg-slate-50 font-semibold text-xs text-rose-600">
                            <td colspan="5" class="p-1.5 text-right border">Diskon / Potongan Harga:</td>
                            <td class="p-1.5 text-right border">- Rp {{ Number(printData.diskon).toLocaleString() }}</td>
                        </tr>
                        <tr class="bg-indigo-50 font-bold text-xs">
                            <td colspan="5" class="p-2 text-right text-indigo-900 border">TOTAL YANG HARUS DIBAYAR:</td>
                            <td class="p-2 text-right text-indigo-900 border">Rp {{ printData.total_tagihan.toLocaleString() }}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-100">
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

                <div v-if="profile.tos" class="mt-4 border-t pt-2 text-[8px] text-slate-400 leading-tight">
                    <p class="font-bold text-slate-500 mb-0.5">Syarat & Ketentuan (Terms of Service):</p>
                    <p class="whitespace-pre-line pl-2">{{ profile.tos }}</p>
                </div>
            </div>

            <!-- 2. DOKUMEN NOTA SURAT JALAN HARIAN (A5) -->
            <div v-if="printA5Data" class="hidden print:block w-full max-w-xl bg-white text-black text-xs space-y-8">
                
                <!-- LEMBAR 1: NOTA HOUSEKEEPING / ASLI -->
                <div class="p-4 print-page">
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
                            <h2 class="text-base font-extrabold text-slate-700 tracking-wider">NOTA HOUSEKEEPING</h2>
                            <p class="text-[9px] text-slate-500 mt-0.5">Tgl: {{ formatDate(printA5Data.tanggal) }}</p>
                        </div>
                    </div>

                    <div class="mb-3">
                        <p class="text-[10px]"><span class="font-bold text-indigo-900">Pelanggan:</span> <strong class="text-sm text-slate-800">{{ getCustomerName(printA5Data.id_pelanggan) }}</strong></p>
                        <p class="text-[9px] text-slate-500">{{ getCustomerAddress(printA5Data.id_pelanggan) }}</p>
                    </div>

                    <table class="w-full text-left border-collapse border border-slate-300 text-[10px] mb-3">
                        <thead>
                            <tr class="bg-indigo-900 text-white font-semibold">
                                <th class="p-1 border text-center">No.</th>
                                <th class="p-1 border">Nama Item Linen / Cucian</th>
                                <th class="p-1 border text-center">Satuan</th>
                                <th class="p-1 border text-center">Qty</th>
                                <th class="p-1 border text-right">Harga Satuan</th>
                                <th class="p-1 border text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(item, idx) in printA5Data.items" :key="item.id_layanan">
                                <td class="p-1 border text-center">{{ idx + 1 }}</td>
                                <td class="p-1 border font-semibold text-slate-800">{{ getServiceName(item.id_layanan) }}</td>
                                <td class="p-1 border text-center text-slate-600">{{ getServiceUnit(item.id_layanan) }}</td>
                                <td class="p-1 border text-center font-bold text-slate-900">{{ item.qty }}</td>
                                <td class="p-1 border text-right text-slate-600">Rp {{ getItemPriceA5(item, printA5Data.id_pelanggan, false).toLocaleString() }}</td>
                                <td class="p-1 border text-right font-bold text-slate-800">Rp {{ (getItemPriceA5(item, printA5Data.id_pelanggan, false) * item.qty).toLocaleString() }}</td>
                            </tr>
                            <tr class="bg-indigo-50 font-bold">
                                <td colspan="5" class="p-1.5 text-right text-indigo-900 border">TOTAL TRANSAKSI:</td>
                                <td class="p-1.5 text-right text-indigo-900 border">Rp {{ calculateA5Total(printA5Data.items, printA5Data.id_pelanggan, false).toLocaleString() }}</td>
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

                <!-- LEMBAR 2: GUEST LAUNDRY RECEIPT (HANYA MUNCUL JIKA MARKUP > 0) -->
                <div v-if="getCustomerMarkup && getCustomerMarkup(printA5Data.id_pelanggan) > 0" class="p-4 print-page border-t-2 border-dashed border-slate-300 pt-8">
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
                            <h2 class="text-base font-extrabold text-indigo-950 tracking-wider">GUEST LAUNDRY RECEIPT</h2>
                            <p class="text-[9px] text-slate-500 mt-0.5">Tgl: {{ formatDate(printA5Data.tanggal) }}</p>
                        </div>
                    </div>

                    <div class="mb-3 flex justify-between items-end">
                        <div>
                            <p class="text-[10px]"><span class="font-bold text-indigo-900">Hotel / Resort:</span> <strong class="text-sm text-slate-800">{{ getCustomerName(printA5Data.id_pelanggan) }}</strong></p>
                            <p class="text-[9px] text-slate-500">{{ getCustomerAddress(printA5Data.id_pelanggan) }}</p>
                        </div>
                        <div class="text-right bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                            <span class="text-[9px] font-bold text-indigo-900">Guest Service Rate (+{{ getCustomerMarkup(printA5Data.id_pelanggan) }}%)</span>
                        </div>
                    </div>

                    <table class="w-full text-left border-collapse border border-slate-300 text-[10px] mb-3">
                        <thead>
                            <tr class="bg-indigo-900 text-white font-semibold">
                                <th class="p-1 border text-center">No.</th>
                                <th class="p-1 border">Item Description</th>
                                <th class="p-1 border text-center">Unit</th>
                                <th class="p-1 border text-center">Qty</th>
                                <th class="p-1 border text-right">Unit Price</th>
                                <th class="p-1 border text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(item, idx) in printA5Data.items" :key="item.id_layanan">
                                <td class="p-1 border text-center">{{ idx + 1 }}</td>
                                <td class="p-1 border font-semibold text-slate-800">{{ getServiceName(item.id_layanan) }}</td>
                                <td class="p-1 border text-center text-slate-600">{{ getServiceUnit(item.id_layanan) }}</td>
                                <td class="p-1 border text-center font-bold text-slate-900">{{ item.qty }}</td>
                                <td class="p-1 border text-right text-slate-600">Rp {{ getItemPriceA5(item, printA5Data.id_pelanggan, true).toLocaleString() }}</td>
                                <td class="p-1 border text-right font-bold text-slate-800">Rp {{ (getItemPriceA5(item, printA5Data.id_pelanggan, true) * item.qty).toLocaleString() }}</td>
                            </tr>
                            <tr class="bg-indigo-50 font-bold">
                                <td colspan="5" class="p-1.5 text-right text-indigo-900 border">TOTAL AMOUNT DUE:</td>
                                <td class="p-1.5 text-right text-indigo-900 border">Rp {{ calculateA5Total(printA5Data.items, printA5Data.id_pelanggan, true).toLocaleString() }}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="grid grid-cols-2 gap-4 mt-6 text-center text-[10px]">
                        <div>
                            <p class="text-slate-500 mb-8">Guest Signature,</p>
                            <p class="border-t border-slate-400 pt-0.5 inline-block px-6">( ............................ )</p>
                        </div>
                        <div>
                            <p class="text-slate-500 mb-8">Housekeeping / Front Desk,</p>
                            <p class="border-t border-slate-400 pt-0.5 inline-block px-6">( ............................ )</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    `
};