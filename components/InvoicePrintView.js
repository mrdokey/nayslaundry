export default {
    name: 'InvoicePrintView',
    props: ['printData', 'printA5Data', 'printKwitansiData', 'printDateData', 'profile', 'getCustomerName', 'getCustomerAddress', 'getCustomerMarkup', 'getServiceName', 'getServiceUnit', 'getPrice', 'formatDate', 'formatMonthYear', 'terbilang'],
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

        const getItemsByDate = (items) => {
            if (!items) return [];
            const dateMap = {};

            items.forEach(item => {
                const price = item.harga_satuan || 0;
                (item.dates || []).forEach(d => {
                    const dateKey = d.tanggal;
                    if (!dateMap[dateKey]) {
                        dateMap[dateKey] = {
                            tanggal: dateKey,
                            no_nota: d.no_nota || '-',
                            itemList: [],
                            subtotal: 0
                        };
                    }
                    const itemSub = Number(d.qty) * price;
                    dateMap[dateKey].itemList.push({
                        nama_layanan: item.nama_layanan,
                        satuan: item.satuan,
                        qty: d.qty,
                        harga_satuan: price,
                        subtotal: itemSub
                    });
                    dateMap[dateKey].subtotal += itemSub;
                });
            });

            return Object.values(dateMap).sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));
        };

        return { calculateA5Total, getItemPriceA5, getItemsByDate };
    },
    template: `
        <div>
            <!-- 1. DOKUMEN INVOICE BULANAN FORMAT 1 (A4) -->
            <div v-if="printData" class="hidden print:block w-full max-w-4xl mx-auto p-6 bg-white text-black text-[11px] print-page border border-slate-200">
                <div class="flex justify-between items-start border-b-2 border-black pb-3 mb-4 mt-4">
                    <div class="flex items-center space-x-3">
                        <!-- LOGO REVISI: rounded (bukan circle), object-contain (tidak terpotong) -->
                        <img v-if="profile.logo_url" :src="profile.logo_url" class="w-12 h-12 object-contain rounded bg-slate-100 p-0.5 shrink-0 grayscale">
                        <div class="leading-tight">
                            <h1 class="text-base font-extrabold text-black uppercase tracking-wide leading-none mb-0.5">{{ profile.nama_laundry || 'Nays Laundry' }}</h1>
                            <p class="text-[9px] text-slate-700 whitespace-pre-line leading-tight">{{ profile.alamat }}</p>
                            <p class="text-[9px] text-slate-700 leading-tight">Telp: {{ profile.no_telepon }}</p>
                        </div>
                    </div>
                    <div class="text-right leading-tight mt-2">
                        <h2 class="text-lg font-extrabold text-slate-800 tracking-wider leading-none">INVOICE</h2>
                        <p class="text-[9px] text-slate-800 mt-1 font-semibold">Nomor: {{ printData.no_invoice }}</p>
                        <p class="text-[9px] text-slate-600">Tanggal: {{ formatDate(printData.tanggal_buat) }}</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-4 text-[10px]">
                    <div>
                        <h3 class="font-extrabold text-black uppercase mb-0.5">Bill To:</h3>
                        <p class="font-extrabold text-black text-xs leading-none">{{ getCustomerName(printData.id_pelanggan) }}</p>
                        <p class="text-slate-800 mt-0.5">{{ getCustomerAddress(printData.id_pelanggan) }}</p>
                    </div>
                    <div class="text-right">
                        <h3 class="font-extrabold text-black uppercase mb-0.5">Periode & Tipe:</h3>
                        <p class="font-extrabold text-black text-xs leading-none">{{ formatMonthYear(printData.periode) }} (Rekap Per Item)</p>
                        <p class="text-slate-600 mt-0.5">Payment Method: Cash / Transfer</p>
                    </div>
                </div>

                <table class="w-full text-left border-collapse border border-black text-[10px] mb-4">
                    <thead>
                        <tr class="bg-slate-200 text-black font-extrabold text-[9px] border-b-2 border-black">
                            <th class="p-2 border border-black">Deskripsi Item Laundry & Rincian Tanggal (No. SJ)</th>
                            <th class="p-2 border border-black text-center w-12">Satuan</th>
                            <th class="p-2 border border-black text-center w-14">Total Qty</th>
                            <th class="p-2 border border-black text-right w-24">Harga Satuan</th>
                            <th class="p-2 border border-black text-right w-24">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-black">
                        <tr v-for="(item, idx) in printData.items" :key="idx" class="even:bg-slate-50">
                            <td class="p-1.5 border border-black">
                                <div class="font-extrabold text-black text-[10px] leading-tight">{{ item.nama_layanan }}</div>
                                <div v-if="item.dates && item.dates.length > 0" class="text-[8px] text-slate-800 mt-0.5 leading-tight">
                                    <span v-for="(d, dIdx) in item.dates" :key="dIdx" class="inline-block bg-slate-100 px-1 py-0 rounded border border-slate-400 mr-1 mb-0.5">
                                        📅 {{ d.tanggal }} <span v-if="d.no_nota && d.no_nota !== '-'">({{ d.no_nota }})</span>: <strong class="text-black">{{ d.qty }} {{ item.satuan }}</strong>
                                    </span>
                                </div>
                            </td>
                            <td class="p-1.5 border border-black text-center text-slate-800 align-top font-semibold">{{ item.satuan }}</td>
                            <td class="p-1.5 border border-black text-center font-extrabold text-black align-top">{{ item.qty }}</td>
                            <td class="p-1.5 border border-black text-right text-slate-800 align-top font-semibold">Rp {{ (item.harga_satuan || 0).toLocaleString() }}</td>
                            <td class="p-1.5 border border-black text-right font-extrabold text-black align-top">Rp {{ (item.subtotal || 0).toLocaleString() }}</td>
                        </tr>
                        <tr v-if="printData.diskon && printData.diskon > 0" class="bg-slate-100 font-bold text-[10px]">
                            <td colspan="4" class="p-1.5 text-right text-slate-800 border border-black">Subtotal Tagihan:</td>
                            <td class="p-1.5 text-right text-black border border-black">Rp {{ (printData.subtotal_penyesuaian || printData.subtotal_awal || printData.total_tagihan).toLocaleString() }}</td>
                        </tr>
                        <tr v-if="printData.diskon && printData.diskon > 0" class="bg-slate-100 font-bold text-[10px]">
                            <td colspan="4" class="p-1.5 text-right border border-black">Diskon / Potongan Harga:</td>
                            <td class="p-1.5 text-right border border-black">- Rp {{ Number(printData.diskon).toLocaleString() }}</td>
                        </tr>
                        <tr class="bg-slate-200 font-extrabold text-xs">
                            <td colspan="4" class="p-2 text-right text-black border border-black uppercase">GRAND TOTAL INVOICE:</td>
                            <td class="p-2 text-right text-black border border-black text-sm">Rp {{ printData.total_tagihan.toLocaleString() }}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-black text-[10px]">
                    <div>
                        <h4 class="font-extrabold text-black uppercase mb-0.5">Informasi Rekening Pembayaran:</h4>
                        <p class="text-black font-bold leading-tight">
                            Bank: {{ profile.bank_cabang || '-' }} | No. Rek: {{ profile.bank_nomor || '-' }}<br>
                            A/N: {{ profile.bank_nama || '-' }}
                        </p>
                    </div>
                    <div class="text-center flex flex-col justify-end items-center">
                        <p class="text-slate-800 mb-6 font-semibold">Hormat Kami,</p>
                        <p class="font-extrabold text-black border-t border-black pt-0.5 px-6 uppercase">{{ profile.nama_laundry || 'Nays Laundry' }}</p>
                    </div>
                </div>

                <div v-if="profile.tos" class="mt-4 border-t border-slate-200 pt-2 text-[8px] text-slate-700 leading-tight">
                    <p class="font-extrabold text-black mb-0.5">Syarat & Ketentuan (Terms of Service):</p>
                    <p class="whitespace-pre-line pl-2 font-semibold">{{ profile.tos }}</p>
                </div>
            </div>

            <!-- 2. DOKUMEN INVOICE FORMAT 2: REKAP PER TANGGAL NOTA HARIAN (A4) -->
            <div v-if="printDateData" class="hidden print:block w-full max-w-4xl mx-auto p-6 bg-white text-black text-[11px] print-page border border-slate-200">
                <div class="flex justify-between items-start border-b-2 border-black pb-3 mb-4 mt-4">
                    <div class="flex items-center space-x-3">
                        <img v-if="profile.logo_url" :src="profile.logo_url" class="w-12 h-12 object-contain rounded bg-slate-100 p-0.5 shrink-0 grayscale">
                        <div class="leading-tight">
                            <h1 class="text-base font-extrabold text-black uppercase tracking-wide leading-none mb-0.5">{{ profile.nama_laundry || 'Nays Laundry' }}</h1>
                            <p class="text-[9px] text-slate-700 whitespace-pre-line leading-tight">{{ profile.alamat }}</p>
                            <p class="text-[9px] text-slate-700 leading-tight">Telp: {{ profile.no_telepon }}</p>
                        </div>
                    </div>
                    <div class="text-right leading-tight mt-2">
                        <h2 class="text-lg font-extrabold text-slate-800 tracking-wider leading-none">INVOICE</h2>
                        <p class="text-[9px] text-slate-800 mt-1 font-semibold">Nomor: {{ printDateData.no_invoice }}</p>
                        <p class="text-[9px] text-slate-600">Tanggal: {{ formatDate(printDateData.tanggal_buat) }}</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-4 text-[10px]">
                    <div>
                        <h3 class="font-extrabold text-black uppercase mb-0.5">Bill To:</h3>
                        <p class="font-extrabold text-black text-xs leading-none">{{ getCustomerName(printDateData.id_pelanggan) }}</p>
                        <p class="text-slate-800 mt-0.5">{{ getCustomerAddress(printDateData.id_pelanggan) }}</p>
                    </div>
                    <div class="text-right">
                        <h3 class="font-extrabold text-black uppercase mb-0.5">Periode & Tipe:</h3>
                        <p class="font-extrabold text-black text-xs leading-none">{{ formatMonthYear(printDateData.periode) }} (Rekap Per Tanggal)</p>
                        <p class="text-slate-600 mt-0.5">Payment Method: Cash / Transfer</p>
                    </div>
                </div>

                <table class="w-full text-left border-collapse border border-black text-[10px] mb-4">
                    <thead>
                        <tr class="bg-slate-200 text-black font-extrabold text-[9px] border-b-2 border-black">
                            <th class="p-2 border border-black text-center w-8">No.</th>
                            <th class="p-2 border border-black text-center w-24">Tanggal Nota</th>
                            <th class="p-2 border border-black">Rincian Cucian (Item & Qty)</th>
                            <th class="p-2 border border-black text-right w-28">Subtotal Tanggal</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-black">
                        <tr v-for="(group, gIdx) in getItemsByDate(printDateData.items)" :key="gIdx" class="even:bg-slate-50">
                            <td class="p-1.5 border border-black text-center font-bold text-slate-800">{{ gIdx + 1 }}</td>
                            <td class="p-1.5 border border-black text-center">
                                <div class="font-extrabold text-black">{{ group.tanggal }}</div>
                                <div class="text-[8px] text-slate-700 mt-0.5 font-bold">{{ group.no_nota }}</div>
                            </td>
                            <td class="p-1.5 border border-black">
                                <div class="text-[9.5px] leading-relaxed text-black font-semibold">
                                    <span v-for="(subI, sIdx) in group.itemList" :key="sIdx" class="inline-block mr-3 mb-0.5">
                                        • {{ subI.nama_layanan }}: <strong class="text-black">{{ subI.qty }} {{ subI.satuan }}</strong> (Rp {{ subI.harga_satuan.toLocaleString() }})
                                    </span>
                                </div>
                            </td>
                            <td class="p-1.5 border border-black text-right font-extrabold text-black">Rp {{ group.subtotal.toLocaleString() }}</td>
                        </tr>
                        <tr v-if="printDateData.diskon && printDateData.diskon > 0" class="bg-slate-100 font-bold text-[10px]">
                            <td colspan="3" class="p-1.5 text-right text-slate-800 border border-black">Subtotal Tagihan:</td>
                            <td class="p-1.5 text-right text-black border border-black">Rp {{ (printDateData.subtotal_penyesuaian || printDateData.subtotal_awal || printDateData.total_tagihan).toLocaleString() }}</td>
                        </tr>
                        <tr v-if="printDateData.diskon && printDateData.diskon > 0" class="bg-slate-100 font-bold text-[10px]">
                            <td colspan="3" class="p-1.5 text-right border border-black">Diskon / Potongan Harga:</td>
                            <td class="p-1.5 text-right border border-black">- Rp {{ Number(printDateData.diskon).toLocaleString() }}</td>
                        </tr>
                        <tr class="bg-slate-200 font-extrabold text-xs">
                            <td colspan="3" class="p-2 text-right text-black border border-black uppercase">GRAND TOTAL INVOICE:</td>
                            <td class="p-2 text-right text-black border border-black text-sm">Rp {{ printDateData.total_tagihan.toLocaleString() }}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-black text-[10px]">
                    <div>
                        <h4 class="font-extrabold text-black uppercase mb-0.5">Informasi Rekening Pembayaran:</h4>
                        <p class="text-black font-bold leading-tight">
                            Bank: {{ profile.bank_cabang || '-' }} | No. Rek: {{ profile.bank_nomor || '-' }}<br>
                            A/N: {{ profile.bank_nama || '-' }}
                        </p>
                    </div>
                    <div class="text-center flex flex-col justify-end items-center">
                        <p class="text-slate-800 mb-6 font-semibold">Hormat Kami,</p>
                        <p class="font-extrabold text-black border-t border-black pt-0.5 px-6 uppercase">{{ profile.nama_laundry || 'Nays Laundry' }}</p>
                    </div>
                </div>

                <div v-if="profile.tos" class="mt-4 border-t border-slate-200 pt-2 text-[8px] text-slate-700 leading-tight">
                    <p class="font-extrabold text-black mb-0.5">Syarat & Ketentuan (Terms of Service):</p>
                    <p class="whitespace-pre-line pl-2 font-semibold">{{ profile.tos }}</p>
                </div>
            </div>

            <!-- 3. DOKUMEN NOTA SURAT JALAN HARIAN (A4 DIBAGI 2 - TOP & BOTTOM) -->
            <div v-if="printA5Data" class="hidden print:block w-full max-w-3xl mx-auto bg-white text-black text-[10px] print-page">
                
                <!-- LEMBAR 1: NOTA HOUSEKEEPING / ASLI -->
                <div class="px-8 py-6 min-h-[50vh] flex flex-col justify-center">
                    <div class="flex justify-between items-start border-b border-black pb-2 mb-3">
                        <div class="flex items-center space-x-2">
                            <img v-if="profile.logo_url" :src="profile.logo_url" class="w-8 h-8 object-contain rounded bg-slate-100 p-0.5 shrink-0 grayscale">
                            <div class="leading-tight">
                                <h1 class="text-sm font-extrabold text-black uppercase leading-none">{{ profile.nama_laundry || 'Nays Laundry' }}</h1>
                                <p class="text-[8px] text-slate-800 font-semibold whitespace-pre-line leading-tight">{{ profile.alamat }}</p>
                            </div>
                        </div>
                        <div class="text-right leading-tight">
                            <h2 class="text-sm font-extrabold text-slate-800 tracking-widest">NOTA HOUSEKEEPING</h2>
                            <p class="text-[8px] text-black font-extrabold mt-0.5">No. SJ: {{ printA5Data.no_nota || '-' }}</p>
                            <p class="text-[8px] text-slate-700 font-semibold">Tgl: {{ formatDate(printA5Data.tanggal) }}</p>
                        </div>
                    </div>

                    <div class="mb-3 flex justify-between items-start text-[9px]">
                        <div>
                            <p><span class="font-extrabold text-black">Pelanggan:</span> <strong class="text-xs text-black">{{ getCustomerName(printA5Data.id_pelanggan) }}</strong></p>
                            <p class="text-[8px] text-slate-800 font-semibold mt-0.5">{{ getCustomerAddress(printA5Data.id_pelanggan) }}</p>
                        </div>
                        <div v-if="printA5Data.nama_tamu || printA5Data.nomor_kamar" class="text-right leading-tight p-1 bg-slate-100 border border-black rounded">
                            <p v-if="printA5Data.nama_tamu"><span class="font-extrabold text-black">Tamu:</span> <strong class="text-black">{{ printA5Data.nama_tamu }}</strong></p>
                            <p v-if="printA5Data.nomor_kamar"><span class="font-extrabold text-black">Kamar:</span> <strong class="text-black">{{ printA5Data.nomor_kamar }}</strong></p>
                        </div>
                    </div>

                    <table class="w-full text-left border-collapse border border-black text-[9px] mb-2">
                        <thead>
                            <tr class="bg-slate-200 text-black font-extrabold border-b-2 border-black">
                                <th class="p-1 border border-black text-center w-8">No.</th>
                                <th class="p-1 border border-black">Nama Item Linen / Cucian</th>
                                <th class="p-1 border border-black text-center w-10">Satuan</th>
                                <th class="p-1 border border-black text-center w-10">Qty</th>
                                <th class="p-1 border border-black text-right w-20">Harga Satuan</th>
                                <th class="p-1 border border-black text-right w-20">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(item, idx) in printA5Data.items" :key="item.id_layanan">
                                <td class="p-1 border border-black text-center font-bold">{{ idx + 1 }}</td>
                                <td class="p-1 border border-black font-bold text-black">{{ getServiceName(item.id_layanan) }}</td>
                                <td class="p-1 border border-black text-center text-slate-800 font-semibold">{{ getServiceUnit(item.id_layanan) }}</td>
                                <td class="p-1 border border-black text-center font-extrabold text-black">{{ item.qty }}</td>
                                <td class="p-1 border border-black text-right text-slate-800 font-semibold">Rp {{ getItemPriceA5(item, printA5Data.id_pelanggan, false).toLocaleString() }}</td>
                                <td class="p-1 border border-black text-right font-extrabold text-black">Rp {{ (getItemPriceA5(item, printA5Data.id_pelanggan, false) * item.qty).toLocaleString() }}</td>
                            </tr>
                            <tr class="bg-slate-100 font-extrabold">
                                <td colspan="5" class="p-1.5 text-right text-black border border-black">TOTAL TRANSAKSI:</td>
                                <td class="p-1.5 text-right text-black border border-black">Rp {{ calculateA5Total(printA5Data.items, printA5Data.id_pelanggan, false).toLocaleString() }}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="grid grid-cols-2 gap-4 mt-4 text-center text-[9px]">
                        <div>
                            <p class="text-slate-800 font-bold mb-6">Penerima (Hotel/Vila),</p>
                            <p class="border-t border-black pt-0.5 inline-block px-8">( ............................ )</p>
                        </div>
                        <div>
                            <p class="text-slate-800 font-bold mb-6">Petugas / Driver,</p>
                            <p class="border-t border-black pt-0.5 inline-block px-8">( ............................ )</p>
                        </div>
                    </div>
                </div>

                <!-- LEMBAR 2: GUEST LAUNDRY RECEIPT (SETENGAH HALAMAN BAWAH) -->
                <div v-if="getCustomerMarkup && getCustomerMarkup(printA5Data.id_pelanggan) > 0" class="px-8 py-6 min-h-[50vh] flex flex-col justify-center border-t-2 border-dashed border-black">
                    <div class="flex justify-between items-start border-b border-black pb-2 mb-3">
                        <div class="flex items-center space-x-2">
                            <img v-if="profile.logo_url" :src="profile.logo_url" class="w-8 h-8 object-contain rounded bg-slate-100 p-0.5 shrink-0 grayscale">
                            <div class="leading-tight">
                                <h1 class="text-sm font-extrabold text-black uppercase leading-none">{{ profile.nama_laundry || 'Nays Laundry' }}</h1>
                                <p class="text-[8px] text-slate-800 font-semibold whitespace-pre-line leading-tight">{{ profile.alamat }}</p>
                            </div>
                        </div>
                        <div class="text-right leading-tight">
                            <h2 class="text-sm font-extrabold text-slate-800 tracking-widest">GUEST LAUNDRY RECEIPT</h2>
                            <p class="text-[8px] text-black font-extrabold mt-0.5">No. SJ: {{ printA5Data.no_nota || '-' }}</p>
                            <p class="text-[8px] text-slate-700 font-semibold">Tgl: {{ formatDate(printA5Data.tanggal) }}</p>
                        </div>
                    </div>

                    <div class="mb-3 flex justify-between items-end text-[9px]">
                        <div>
                            <p><span class="font-extrabold text-black">Hotel / Resort:</span> <strong class="text-xs text-black">{{ getCustomerName(printA5Data.id_pelanggan) }}</strong></p>
                            <p v-if="printA5Data.nama_tamu" class="mt-1"><span class="font-extrabold text-black">Guest Name:</span> <strong class="text-black">{{ printA5Data.nama_tamu }}</strong></p>
                            <p v-if="printA5Data.nomor_kamar"><span class="font-extrabold text-black">Room No:</span> <strong class="text-black">{{ printA5Data.nomor_kamar }}</strong></p>
                        </div>
                    </div>

                    <table class="w-full text-left border-collapse border border-black text-[9px] mb-2">
                        <thead>
                            <tr class="bg-slate-200 text-black font-extrabold border-b-2 border-black">
                                <th class="p-1 border border-black text-center w-8">No.</th>
                                <th class="p-1 border border-black">Item Description</th>
                                <th class="p-1 border border-black text-center w-10">Unit</th>
                                <th class="p-1 border border-black text-center w-10">Qty</th>
                                <th class="p-1 border border-black text-right w-20">Unit Price</th>
                                <th class="p-1 border border-black text-right w-20">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(item, idx) in printA5Data.items" :key="item.id_layanan">
                                <td class="p-1 border border-black text-center font-bold">{{ idx + 1 }}</td>
                                <td class="p-1 border border-black font-bold text-black">{{ getServiceName(item.id_layanan) }}</td>
                                <td class="p-1 border border-black text-center text-slate-800 font-semibold">{{ getServiceUnit(item.id_layanan) }}</td>
                                <td class="p-1 border border-black text-center font-extrabold text-black">{{ item.qty }}</td>
                                <td class="p-1 border border-black text-right text-slate-800 font-semibold">Rp {{ getItemPriceA5(item, printA5Data.id_pelanggan, true).toLocaleString() }}</td>
                                <td class="p-1 border border-black text-right font-extrabold text-black">Rp {{ (getItemPriceA5(item, printA5Data.id_pelanggan, true) * item.qty).toLocaleString() }}</td>
                            </tr>
                            <tr class="bg-slate-100 font-extrabold text-[10px]">
                                <td colspan="5" class="p-1.5 text-right text-black border border-black">TOTAL AMOUNT DUE:</td>
                                <td class="p-1.5 text-right text-black border border-black">Rp {{ calculateA5Total(printA5Data.items, printA5Data.id_pelanggan, true).toLocaleString() }}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="grid grid-cols-2 gap-4 mt-4 text-center text-[9px]">
                        <div>
                            <p class="text-slate-800 font-bold mb-6">Guest Signature,</p>
                            <p class="border-t border-black pt-0.5 inline-block px-8">( ............................ )</p>
                        </div>
                        <div>
                            <p class="text-slate-800 font-bold mb-6">Housekeeping / Front Desk,</p>
                            <p class="border-t border-black pt-0.5 inline-block px-8">( ............................ )</p>
                        </div>
                    </div>
                </div>

            </div>

            <!-- 4. DOKUMEN KWITANSI PEMBAYARAN RESMI -->
            <div v-if="printKwitansiData" class="hidden print:block w-full max-w-2xl mx-auto p-6 bg-white text-black text-xs print-page border-2 border-black rounded-xl space-y-4 my-8">
                <div class="flex justify-between items-start border-b-2 border-black pb-3">
                    <div class="flex items-center space-x-3">
                        <img v-if="profile.logo_url" :src="profile.logo_url" class="w-12 h-12 object-contain rounded bg-slate-100 p-0.5 shrink-0 grayscale">
                        <div class="leading-tight">
                            <h1 class="text-base font-extrabold text-black uppercase leading-none mb-0.5">{{ profile.nama_laundry || 'Nays Laundry' }}</h1>
                            <p class="text-[9px] text-slate-800 font-semibold whitespace-pre-line leading-tight">{{ profile.alamat }}</p>
                            <p class="text-[9px] text-slate-800 font-semibold leading-tight">Telp: {{ profile.no_telepon }}</p>
                        </div>
                    </div>
                    <div class="text-right leading-tight">
                        <h2 class="text-base font-extrabold text-black tracking-wider">KWITANSI PEMBAYARAN</h2>
                        <p class="text-[9px] text-slate-800 font-bold mt-1">No: KWT/{{ printKwitansiData.no_invoice.replace('INV/', '') }}</p>
                        <p class="text-[9px] text-slate-600 font-bold">Tgl Pelunasan: {{ formatDate(printKwitansiData.tanggal_buat) }}</p>
                    </div>
                </div>

                <div class="space-y-3 text-xs py-2">
                    <div class="flex">
                        <span class="w-40 font-extrabold text-black">Telah Diterima Dari</span>
                        <span class="font-extrabold text-black text-sm">: {{ getCustomerName(printKwitansiData.id_pelanggan) }}</span>
                    </div>
                    <div class="flex items-start">
                        <span class="w-40 font-extrabold text-black shrink-0 mt-1.5">Uang Sejumlah</span>
                        <span class="font-bold text-black bg-slate-100 p-2 rounded border border-black italic w-full leading-relaxed">
                            : {{ terbilang ? terbilang(printKwitansiData.total_tagihan) : '' }}
                        </span>
                    </div>
                    <div class="flex">
                        <span class="w-40 font-extrabold text-black">Untuk Pembayaran</span>
                        <span class="font-bold text-black">: Pelunasan Invoice No. {{ printKwitansiData.no_invoice }} (Periode {{ formatMonthYear(printKwitansiData.periode) }})</span>
                    </div>
                    <div class="flex">
                        <span class="w-40 font-extrabold text-black">Status Pembayaran</span>
                        <span class="font-extrabold text-black uppercase">: LUNAS VIA {{ printKwitansiData.status_pembayaran === 'lunas_cash' ? 'CASH (TUNAI)' : 'BANK TRANSFER' }}</span>
                    </div>
                </div>

                <div class="flex justify-between items-center pt-6 border-t border-black">
                    <div class="bg-black text-white px-6 py-2.5 rounded-lg font-extrabold text-lg shadow">
                        Rp {{ printKwitansiData.total_tagihan.toLocaleString() }}
                    </div>
                    <div class="text-center text-[10px]">
                        <p class="text-slate-800 font-bold mb-8">Penerima / Kasir,</p>
                        <p class="font-extrabold text-black border-t border-black pt-0.5 px-8 uppercase">{{ profile.nama_laundry || 'Nays Laundry' }}</p>
                    </div>
                </div>
            </div>
        </div>
    `
};