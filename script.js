// =========================================================
// KONFIGURASI — ganti dengan URL Web App Apps Script kamu
// =========================================================
const API_URL = "https://script.google.com/macros/s/GANTI_DENGAN_ID_DEPLOYMENT/exec";

// =========================================================
// STATE
// =========================================================
let currentUstadz = null; // { username, nama, halaqah }

// =========================================================
// HELPER: panggil backend Apps Script
// Catatan: content-type dibuat "text/plain" supaya browser TIDAK
// mengirim preflight OPTIONS request (Apps Script Web App tidak
// menangani OPTIONS dengan baik). Backend tetap mem-parse body-nya
// sebagai JSON.
// =========================================================
async function callApi(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Gagal menghubungi server (" + res.status + ")");
  return res.json();
}

function showToast(message, isError) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast show" + (isError ? " error" : "");
  setTimeout(() => (toast.className = "toast"), 2500);
}

// =========================================================
// LOGIN
// =========================================================
const formLogin = document.getElementById("form-login");
const loginError = document.getElementById("login-error");
const btnLogin = document.getElementById("btn-login");

formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  btnLogin.disabled = true;
  btnLogin.textContent = "Memeriksa...";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  try {
    const result = await callApi({ action: "login", username, password });
    if (result.success) {
      currentUstadz = result.ustadz;
      sessionStorage.setItem("ustadz", JSON.stringify(currentUstadz));
      masukKeAplikasi();
    } else {
      loginError.textContent = result.message || "Login gagal.";
    }
  } catch (err) {
    loginError.textContent = "Tidak bisa terhubung ke server: " + err.message;
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = "Masuk";
  }
});

document.getElementById("btn-logout").addEventListener("click", () => {
  sessionStorage.removeItem("ustadz");
  currentUstadz = null;
  document.getElementById("page-main").classList.remove("active");
  document.getElementById("page-login").classList.add("active");
  formLogin.reset();
});

function masukKeAplikasi() {
  document.getElementById("page-login").classList.remove("active");
  document.getElementById("page-main").classList.add("active");
  document.getElementById("nama-ustadz").textContent = currentUstadz.nama;
  document.getElementById("halaqah-ustadz").textContent = currentUstadz.halaqah;
  document.getElementById("nama-halaqah-list").textContent = currentUstadz.halaqah;
  muatDaftarSantri();
}

// Cek sesi tersimpan (biar tidak perlu login ulang tiap refresh)
window.addEventListener("DOMContentLoaded", () => {
  const saved = sessionStorage.getItem("ustadz");
  if (saved) {
    currentUstadz = JSON.parse(saved);
    masukKeAplikasi();
  }
  initRekapFilters();
});

// =========================================================
// TAB NAVIGATION
// =========================================================
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");

    // Setiap kali tab Rekap dibuka, tarik ulang data terbaru dari server
    // (supaya tidak menampilkan data basi setelah ada input baru).
    if (btn.dataset.tab === "tab-rekap") {
      muatRekap();
    }
  });
});

// =========================================================
// DAFTAR SANTRI (halaqah sendiri)
// =========================================================
async function muatDaftarSantri() {
  const container = document.getElementById("daftar-santri");
  container.innerHTML = '<p class="empty-state">Memuat data santri...</p>';
  try {
    const result = await callApi({ action: "getDaftarSantri", halaqah: currentUstadz.halaqah });
    if (result.success) {
      renderDaftarSantri(result.data, container);
      updateProgressBadge(result.data);
    } else {
      container.innerHTML = '<p class="empty-state">' + result.message + "</p>";
    }
  } catch (err) {
    container.innerHTML = '<p class="empty-state">Gagal memuat: ' + err.message + "</p>";
  }
}

function updateProgressBadge(list) {
  const total = list.length;
  const sudah = list.filter((s) => s.status === "Setor").length;
  document.getElementById("progress-badge").textContent = sudah + "/" + total;
}

function renderDaftarSantri(list, container) {
  if (list.length === 0) {
    container.innerHTML = '<p class="empty-state">Belum ada santri di halaqah ini.</p>';
    return;
  }
  container.innerHTML = "";
  list.forEach((santri) => {
    container.appendChild(buatKartuSantri(santri, false));
  });
}

function buatKartuSantri(santri, tampilkanHalaqah) {
  const isSetor = santri.status === "Setor";
  const div = document.createElement("div");
  div.className = "santri-item " + (isSetor ? "status-setor" : "status-belum");

  const info = document.createElement("div");
  info.className = "santri-info";
  info.innerHTML =
    '<div class="nama">' +
    santri.nama +
    "</div>" +
    (tampilkanHalaqah ? '<div class="halaqah-label">' + santri.halaqah + "</div>" : "");

  const btn = document.createElement("button");
  btn.className = "status-toggle " + (isSetor ? "setor" : "belum");
  btn.textContent = isSetor ? "Sudah Setor" : "Belum Setor";
  btn.addEventListener("click", () => toggleStatus(santri, btn, div));

  div.appendChild(info);
  div.appendChild(btn);
  return div;
}

async function toggleStatus(santri, btnEl, cardEl) {
  const statusBaru = santri.status === "Setor" ? "Belum Setor" : "Setor";
  btnEl.disabled = true;
  btnEl.textContent = "Menyimpan...";

  try {
    const result = await callApi({
      action: "setStatus",
      idSantri: santri.id,
      nama: santri.nama,
      halaqah: santri.halaqah,
      status: statusBaru,
      dicatatOleh: currentUstadz.nama,
    });
    if (result.success) {
      santri.status = statusBaru;
      const isSetor = statusBaru === "Setor";
      cardEl.className = "santri-item " + (isSetor ? "status-setor" : "status-belum");
      btnEl.className = "status-toggle " + (isSetor ? "setor" : "belum");
      btnEl.textContent = isSetor ? "Sudah Setor" : "Belum Setor";
      showToast(santri.nama + " ditandai " + statusBaru);
      // refresh progress badge kalau santri ini dari halaqah sendiri
      if (santri.halaqah === currentUstadz.halaqah) {
        const daftar = document.querySelectorAll("#daftar-santri .santri-item");
        // hitung ulang sederhana dengan re-fetch ringan tidak perlu; hitung manual:
      }
      muatUlangBadgeProgress();
    } else {
      showToast(result.message || "Gagal menyimpan", true);
    }
  } catch (err) {
    showToast("Gagal: " + err.message, true);
  } finally {
    btnEl.disabled = false;
  }
}

async function muatUlangBadgeProgress() {
  try {
    const result = await callApi({ action: "getDaftarSantri", halaqah: currentUstadz.halaqah });
    if (result.success) updateProgressBadge(result.data);
  } catch (err) {
    /* silent */
  }
}

// =========================================================
// CARI SANTRI (lintas halaqah)
// =========================================================
let searchTimeout = null;
document.getElementById("search-santri").addEventListener("input", (e) => {
  const keyword = e.target.value.trim();
  clearTimeout(searchTimeout);
  const hasilContainer = document.getElementById("hasil-pencarian");

  if (keyword === "") {
    hasilContainer.classList.add("hidden");
    hasilContainer.innerHTML = "";
    return;
  }

  searchTimeout = setTimeout(async () => {
    hasilContainer.classList.remove("hidden");
    hasilContainer.innerHTML = '<p class="empty-state">Mencari...</p>';
    try {
      const result = await callApi({ action: "cariSantri", keyword });
      if (result.success) {
        if (result.data.length === 0) {
          hasilContainer.innerHTML = '<p class="empty-state">Santri tidak ditemukan.</p>';
        } else {
          hasilContainer.innerHTML = "";
          result.data.forEach((santri) => {
            hasilContainer.appendChild(buatKartuSantri(santri, true));
          });
        }
      }
    } catch (err) {
      hasilContainer.innerHTML = '<p class="empty-state">Gagal mencari: ' + err.message + "</p>";
    }
  }, 400);
});

// =========================================================
// REKAP
// =========================================================
function initRekapFilters() {
  // isi dropdown bulan
  const selectBulan = document.getElementById("filter-bulan");
  const namaBulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  namaBulan.forEach((nama, idx) => {
    const opt = document.createElement("option");
    opt.value = idx + 1;
    opt.textContent = nama;
    selectBulan.appendChild(opt);
  });

  const today = new Date();
  document.getElementById("filter-tanggal").value = today.toISOString().slice(0, 10);
  selectBulan.value = today.getMonth() + 1;
  document.getElementById("filter-tahun").value = today.getFullYear();
}

let rekapMode = "harian";
document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    rekapMode = btn.dataset.mode;
    document.getElementById("rekap-harian-filter").classList.toggle("hidden", rekapMode !== "harian");
    document.getElementById("rekap-bulanan-filter").classList.toggle("hidden", rekapMode !== "bulanan");
    document.getElementById("rekap-harian-view").classList.toggle("hidden", rekapMode !== "harian");
    document.getElementById("rekap-bulanan-view").classList.toggle("hidden", rekapMode !== "bulanan");
    document.getElementById("rekap-summary").classList.add("hidden");

    // Otomatis muat data untuk mode yang baru dipilih
    muatRekap();
  });
});

let dataRekapTerakhir = []; // dipakai mode harian
let dataBulananTerakhir = null; // dipakai mode bulanan (untuk export)

document.getElementById("btn-muat-rekap").addEventListener("click", muatRekap);

async function muatRekap() {
  document.getElementById("rekap-summary").classList.add("hidden");

  if (rekapMode === "harian") {
    await muatRekapHarian();
  } else {
    await muatRekapBulanan();
  }
}

async function muatRekapHarian() {
  const tbody = document.getElementById("tabel-rekap-body");
  tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Memuat...</td></tr>';
  try {
    const tanggal = document.getElementById("filter-tanggal").value;

    // Ambil SEMUA santri (semua halaqah) + catatan setoran pada tanggal terpilih,
    // lalu digabung supaya santri yang belum pernah ditandai tetap tampil sebagai "Belum Setor".
    const [resSantri, resRekap] = await Promise.all([
      callApi({ action: "getDaftarSantri" }),
      callApi({ action: "getRekapHarian", tanggal }),
    ]);

    if (!resSantri.success) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">' + resSantri.message + "</td></tr>";
      return;
    }
    if (!resRekap.success) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">' + resRekap.message + "</td></tr>";
      return;
    }

    const catatanMap = {};
    resRekap.data.forEach((r) => {
      catatanMap[r.idSantri] = r;
    });

    const data = resSantri.data
      .map((santri) => {
        const catatan = catatanMap[santri.id];
        return {
          tanggal,
          idSantri: santri.id,
          nama: santri.nama,
          halaqah: santri.halaqah,
          status: catatan ? catatan.status : "Belum Setor",
          dicatatOleh: catatan ? catatan.dicatatOleh : "-",
        };
      })
      .sort((a, b) => {
        const h = String(a.halaqah).localeCompare(String(b.halaqah));
        return h !== 0 ? h : String(a.nama).localeCompare(String(b.nama));
      });

    dataRekapTerakhir = data;
    renderTabelRekap(data);
    renderRingkasan(data);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Gagal memuat: ' + err.message + "</td></tr>";
  }
}

async function muatRekapBulanan() {
  const container = document.getElementById("tabel-bulanan-container");
  container.innerHTML = '<p class="empty-state">Memuat...</p>';

  const bulan = Number(document.getElementById("filter-bulan").value);
  const tahun = Number(document.getElementById("filter-tahun").value);

  try {
    const [resSantri, resRekap] = await Promise.all([
      callApi({ action: "getDaftarSantri" }), // tanpa halaqah = semua santri, semua halaqah
      callApi({ action: "getRekapBulanan", bulan, tahun }), // tanpa halaqah = semua halaqah
    ]);

    if (!resSantri.success) {
      container.innerHTML = '<p class="empty-state">' + resSantri.message + "</p>";
      return;
    }
    if (!resRekap.success) {
      container.innerHTML = '<p class="empty-state">' + resRekap.message + "</p>";
      return;
    }

    renderTabelBulanan(resSantri.data, resRekap.data, bulan, tahun);
  } catch (err) {
    container.innerHTML = '<p class="empty-state">Gagal memuat: ' + err.message + "</p>";
  }
}

// Bangun tabel pivot: baris = santri, kolom = tanggal 1..akhir bulan, isi = ikon status
function renderTabelBulanan(daftarSantri, rekapData, bulan, tahun) {
  const container = document.getElementById("tabel-bulanan-container");

  if (daftarSantri.length === 0) {
    container.innerHTML = '<p class="empty-state">Belum ada data santri.</p>';
    dataBulananTerakhir = null;
    return;
  }

  // urutkan: per halaqah, lalu per nama, supaya mudah dibaca saat menampilkan semua halaqah
  const daftarUrut = [...daftarSantri].sort((a, b) => {
    const h = String(a.halaqah).localeCompare(String(b.halaqah));
    return h !== 0 ? h : String(a.nama).localeCompare(String(b.nama));
  });

  const daysInMonth = new Date(tahun, bulan, 0).getDate();
  const now = new Date();
  const isBulanIni = bulan === now.getMonth() + 1 && tahun === now.getFullYear();

  // lookup: "idSantri-hari" -> status
  const statusMap = {};
  rekapData.forEach((row) => {
    const hari = Number(row.tanggal.split("-")[2]);
    statusMap[row.idSantri + "-" + hari] = row.status;
  });

  let totalSemuaSetor = 0;
  let totalSemuaHariBerjalan = 0;

  let thead = '<table class="tabel-bulanan"><thead><tr><th class="col-nama">Nama / Halaqah</th>';
  for (let d = 1; d <= daysInMonth; d++) thead += "<th>" + d + "</th>";
  thead += "<th>Total</th></tr></thead>";

  let tbody = "<tbody>";
  daftarUrut.forEach((santri) => {
    let totalSetor = 0;
    let hariBerjalan = 0;
    let row =
      '<tr><td class="col-nama"><span class="nama-text">' +
      santri.nama +
      '</span><span class="halaqah-text">' +
      santri.halaqah +
      "</span></td>";

    for (let d = 1; d <= daysInMonth; d++) {
      const isFuture = isBulanIni && d > now.getDate();
      const status = statusMap[santri.id + "-" + d];

      let markClass, title;
      if (isFuture) {
        markClass = "mark-future";
        title = "Belum terjadi";
      } else {
        hariBerjalan++;
        if (status === "Setor") {
          markClass = "mark-setor";
          title = "Setor";
          totalSetor++;
        } else {
          markClass = "mark-belum";
          title = "Belum Setor";
        }
      }
      row += '<td><i class="mark ' + markClass + '" title="' + title + '"></i></td>';
    }

    row += '<td class="total-setor">' + totalSetor + " / " + hariBerjalan + "</td></tr>";
    tbody += row;

    totalSemuaSetor += totalSetor;
    totalSemuaHariBerjalan += hariBerjalan;
  });
  tbody += "</tbody></table>";

  container.innerHTML = thead + tbody;

  dataBulananTerakhir = { daftarSantri: daftarUrut, statusMap, bulan, tahun, daysInMonth, isBulanIni };

  renderRingkasanBulanan(daftarUrut.length, totalSemuaSetor, totalSemuaHariBerjalan);
}

function renderRingkasanBulanan(jumlahSantri, totalSetor, totalHariBerjalan) {
  const summaryEl = document.getElementById("rekap-summary");
  const persen = totalHariBerjalan > 0 ? Math.round((totalSetor / totalHariBerjalan) * 100) : 0;
  summaryEl.innerHTML =
    buatKartuRingkasan(jumlahSantri, "Jumlah Santri") +
    buatKartuRingkasan(totalSetor, "Total Setor Tercatat") +
    buatKartuRingkasan(persen + "%", "Rata-rata Kepatuhan Setor");
  summaryEl.classList.remove("hidden");
}

function renderTabelRekap(data) {
  const tbody = document.getElementById("tabel-rekap-body");
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Tidak ada data pada periode ini.</td></tr>';
    return;
  }
  tbody.innerHTML = "";
  data.forEach((row) => {
    const isSetor = row.status === "Setor";
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + row.tanggal + "</td>" +
      "<td>" + row.nama + "</td>" +
      "<td>" + row.halaqah + "</td>" +
      '<td><span class="status-pill ' + (isSetor ? "setor" : "belum") + '">' + row.status + "</span></td>" +
      "<td>" + row.dicatatOleh + "</td>";
    tbody.appendChild(tr);
  });
}

function renderRingkasan(data) {
  const summaryEl = document.getElementById("rekap-summary");
  const total = data.length;
  const setor = data.filter((d) => d.status === "Setor").length;
  const belum = total - setor;

  summaryEl.innerHTML =
    buatKartuRingkasan(total, "Total Catatan") +
    buatKartuRingkasan(setor, "Sudah Setor") +
    buatKartuRingkasan(belum, "Belum Setor");
  summaryEl.classList.remove("hidden");
}

function buatKartuRingkasan(num, label) {
  return (
    '<div class="summary-card"><div class="num">' +
    num +
    '</div><div class="label">' +
    label +
    "</div></div>"
  );
}

// =========================================================
// EXPORT KE EXCEL (format CSV — bisa langsung dibuka di Excel)
// =========================================================
document.getElementById("btn-export").addEventListener("click", () => {
  if (rekapMode === "harian") {
    exportHarianCSV();
  } else {
    exportBulananCSV();
  }
});

function unduhCSV(csvContent, namaFile) {
  // BOM supaya karakter dibaca benar oleh Excel
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = namaFile;
  link.click();
  URL.revokeObjectURL(url);
}

function exportHarianCSV() {
  if (dataRekapTerakhir.length === 0) {
    showToast("Tidak ada data untuk diexport. Klik 'Tampilkan' dulu.", true);
    return;
  }
  const header = ["Tanggal", "Nama", "Halaqah", "Status", "Dicatat Oleh"];
  const rows = dataRekapTerakhir.map((r) => [r.tanggal, r.nama, r.halaqah, r.status, r.dicatatOleh]);

  let csvContent = header.join(";") + "\n";
  rows.forEach((row) => {
    csvContent += row.map((val) => '"' + String(val).replace(/"/g, '""') + '"').join(";") + "\n";
  });

  unduhCSV(csvContent, "rekap-harian-" + document.getElementById("filter-tanggal").value + ".csv");
}

function exportBulananCSV() {
  if (!dataBulananTerakhir) {
    showToast("Tidak ada data untuk diexport. Klik 'Tampilkan' dulu.", true);
    return;
  }
  const { daftarSantri, statusMap, daysInMonth, isBulanIni } = dataBulananTerakhir;
  const now = new Date();

  const header = ["Nama", "Halaqah"];
  for (let d = 1; d <= daysInMonth; d++) header.push(String(d));
  header.push("Total Setor");

  const rows = daftarSantri.map((santri) => {
    let totalSetor = 0;
    let hariBerjalan = 0;
    const row = [santri.nama, santri.halaqah];
    for (let d = 1; d <= daysInMonth; d++) {
      const isFuture = isBulanIni && d > now.getDate();
      if (isFuture) {
        row.push("-");
      } else {
        hariBerjalan++;
        const status = statusMap[santri.id + "-" + d];
        if (status === "Setor") {
          totalSetor++;
          row.push("Setor");
        } else {
          row.push("Belum Setor");
        }
      }
    }
    row.push(totalSetor + "/" + hariBerjalan);
    return row;
  });

  let csvContent = header.join(";") + "\n";
  rows.forEach((row) => {
    csvContent += row.map((val) => '"' + String(val).replace(/"/g, '""') + '"').join(";") + "\n";
  });

  const bulan = document.getElementById("filter-bulan").value;
  const tahun = document.getElementById("filter-tahun").value;
  unduhCSV(csvContent, "rekap-bulanan-" + tahun + "-" + bulan + ".csv");
}
