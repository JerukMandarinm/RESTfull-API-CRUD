import { db } from "./db";
import fs from "fs";

// Fungsi untuk memasukkan konten ke dalam layout utama
function render(viewContent: string) {
  const layout = fs.readFileSync("./views/layout/main.html", "utf8");
  return layout.replace("{{content}}", viewContent);
}

Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // --- ROUTING MAHASISWA ---

    // 1. Dashboard
    if (url.pathname == "/") {
      const [m]: any = await db.query("SELECT COUNT(*) as total FROM mahasiswa");
      const [j]: any = await db.query("SELECT COUNT(*) as total FROM jurusan");

      let view = fs.readFileSync("./views/dashboard/index.html", "utf8");
      view = view.replace("{{total_mahasiswa}}", m[0].total)
        .replace("{{total_jurusan}}", j[0].total);

      return new Response(render(view), { headers: { "Content-Type": "text/html" } });
    }

    // // --- ROUTE DAFTAR MAHASISWA ---
    if (url.pathname == "/mahasiswa") {
      const [rows]: any = await db.query(`
        SELECT m.id, m.nama, m.angkatan, j.nama_jurusan 
        FROM mahasiswa m
        LEFT JOIN jurusan j ON m.jurusan_id = j.id
    `);

      let tableRows = "";
      rows.forEach((m: any) => {
        tableRows += `
        <tr class="hover:bg-gray-50 transition-colors border-b">
            <td class="p-4 text-center text-gray-600">${m.id}</td>
            <td class="p-4 font-semibold text-gray-800">${m.nama}</td>
            <td class="p-4">
                <span class="px-3 py-1 rounded-full text-xs font-medium ${m.nama_jurusan ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}">
                    ${m.nama_jurusan || 'Belum dipilih'}
                </span>
            </td>
            <td class="p-4 text-center text-gray-600">${m.angkatan}</td>
            <td class="p-4 text-center">
                <div class="flex justify-center space-x-2">
                    <a href="/mahasiswa/edit/${m.id}" class="bg-amber-100 text-amber-700 px-3 py-1 rounded hover:bg-amber-200 transition text-sm font-medium">Edit</a>
                    <a href="/mahasiswa/delete/${m.id}" class="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition text-sm font-medium" onclick="return confirm('Hapus data ini?')">Hapus</a>
                </div>
            </td>
        </tr>`;
      });

      let view = fs.readFileSync("./views/mahasiswa/index.html", "utf8");
      return new Response(render(view.replace("{{rows}}", tableRows)), { headers: { "Content-Type": "text/html" } });
    }
    // 3. Form Tambah Mahasiswa
    if (url.pathname == "/mahasiswa/create") {
      const [jurusans]: any = await db.query("SELECT * FROM jurusan");
      let options = "";
      jurusans.forEach((j: any) => {
        options += `<option value="${j.id}">${j.nama_jurusan}</option>`;
      });

      let view = fs.readFileSync("./views/mahasiswa/create.html", "utf8");
      view = view.replace("{{options}}", options);
      return new Response(render(view), { headers: { "Content-Type": "text/html" } });
    }

    // 4. Simpan Mahasiswa
    if (url.pathname == "/mahasiswa/store" && req.method == "POST") {
      const formData = await req.formData();
      await db.query(
        "INSERT INTO mahasiswa (nama, jurusan_id, angkatan) VALUES (?, ?, ?)",
        [formData.get("nama"), formData.get("jurusan_id"), formData.get("angkatan")]
      );
      return Response.redirect("/mahasiswa", 302);
    }

    // 5. Form Edit Mahasiswa
    if (url.pathname.startsWith("/mahasiswa/edit/")) {
      const id = url.pathname.split("/")[3];
      const [rows]: any = await db.query("SELECT * FROM mahasiswa WHERE id = ?", [id]);
      const [jurusans]: any = await db.query("SELECT * FROM jurusan");
      const m = rows[0];

      if (!m) return new Response("Mahasiswa tidak ditemukan", { status: 404 });

      let options = "";
      jurusans.forEach((j: any) => {
        const isSelected = j.id === m.jurusan_id ? "selected" : "";
        options += `<option value="${j.id}" ${isSelected}>${j.nama_jurusan}</option>`;
      });

      let view = fs.readFileSync("./views/mahasiswa/edit.html", "utf8");
      view = view.replace("{{id}}", m.id)
        .replace("{{nama}}", m.nama)
        .replace("{{options}}", options)
        .replace("{{angkatan}}", m.angkatan);

      return new Response(render(view), { headers: { "Content-Type": "text/html" } });
    }

    // 6. Update Mahasiswa 
    if (url.pathname.startsWith("/mahasiswa/update/") && req.method == "POST") {
      const id = url.pathname.split("/")[3];
      const formData = await req.formData();

      // Gunakan UPDATE, bukan INSERT [cite: 733, 734]
      await db.query(
        "UPDATE mahasiswa SET nama=?, jurusan_id=?, angkatan=? WHERE id=?",
        [
          formData.get("nama"),
          formData.get("jurusan_id"), // Pastikan ini sesuai dengan name di <select> HTML
          formData.get("angkatan"),
          id
        ]
      );

      return Response.redirect("/mahasiswa", 302);
    }
    // 7. Delete Mahasiswa
    if (url.pathname.startsWith("/mahasiswa/delete/")) {
      const id = url.pathname.split("/")[3];
      await db.query("DELETE FROM mahasiswa WHERE id = ?", [id]);
      return Response.redirect("/mahasiswa", 302);
    }

    // --- ROUTING JURUSAN ---

    // --- ROUTE DAFTAR JURUSAN ---
    if (url.pathname == "/jurusan") {
      const [rows]: any = await db.query("SELECT * FROM jurusan");
      let tableRows = "";
      rows.forEach((j: any) => {
        tableRows += `
        <tr class="hover:bg-gray-50 transition-colors border-b">
            <td class="p-4 text-center text-gray-600">${j.id}</td>
            <td class="p-4 font-semibold text-gray-800">${j.nama_jurusan}</td>
            <td class="p-4 text-center">
                <div class="flex justify-center space-x-2">
                    <a href="/jurusan/edit/${j.id}" class="bg-amber-100 text-amber-700 px-3 py-1 rounded hover:bg-amber-200 transition text-sm font-medium">Edit</a>
                    <a href="/jurusan/delete/${j.id}" class="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition text-sm font-medium" onclick="return confirm('Hapus jurusan ini?')">Hapus</a>
                </div>
            </td>
        </tr>`;
      });

      let view = fs.readFileSync("./views/jurusan/index.html", "utf8");
      return new Response(render(view.replace("{{rows}}", tableRows)), { headers: { "Content-Type": "text/html" } });
    }

    if (url.pathname == "/jurusan/create") {
      const view = fs.readFileSync("./views/jurusan/create.html", "utf8");
      return new Response(render(view), { headers: { "Content-Type": "text/html" } });
    }

    if (url.pathname == "/jurusan/store" && req.method == "POST") {
      const formData = await req.formData();
      await db.query("INSERT INTO jurusan (nama_jurusan) VALUES (?)", [formData.get("nama_jurusan")]);
      return Response.redirect("/jurusan", 302);
    }

    if (url.pathname.startsWith("/jurusan/edit/")) {
      const id = url.pathname.split("/")[3];
      const [rows]: any = await db.query("SELECT * FROM jurusan WHERE id = ?", [id]);
      const j = rows[0];
      if (!j) return new Response("Jurusan tidak ditemukan", { status: 404 });

      let view = fs.readFileSync("./views/jurusan/edit.html", "utf8");
      view = view.replace("{{id}}", j.id).replace("{{nama_jurusan}}", j.nama_jurusan);
      return new Response(render(view), { headers: { "Content-Type": "text/html" } });
    }

    if (url.pathname.startsWith("/jurusan/update/") && req.method == "POST") {
      const id = url.pathname.split("/")[3];
      const formData = await req.formData();
      await db.query("UPDATE jurusan SET nama_jurusan=? WHERE id=?", [formData.get("nama_jurusan"), id]);
      return Response.redirect("/jurusan", 302);
    }

    if (url.pathname.startsWith("/jurusan/delete/")) {
      const id = url.pathname.split("/")[3];
      await db.query("DELETE FROM jurusan WHERE id = ?", [id]);
      return Response.redirect("/jurusan", 302);
    }

    return new Response("Not Found", { status: 404 });
  }
});
