"""
Genera los archivos SQL de carga (movimientos_bancarios, movimientos_caja,
gastos) a partir de out/registros.json, en lotes pequeños (un archivo por
lote en out/chunks/) para poder revisarlos y ejecutarlos vía Supabase sin
saturar el contexto.
"""
import json
import os

BASE_DIR = os.path.dirname(__file__)
OUT = os.path.join(BASE_DIR, "out")
CHUNKS = os.path.join(OUT, "chunks")
os.makedirs(CHUNKS, exist_ok=True)
for f in os.listdir(CHUNKS):
    os.remove(os.path.join(CHUNKS, f))

regs = json.load(open(os.path.join(OUT, "registros.json")))

SUCURSAL_ID = "45efa1e5-568f-4ff3-967f-d03e4709a549"
CAJA_ID = "38d440b8-11d9-4089-982b-58ea2416c332"
CUENTA_ID = "d1a20342-30c1-4c35-ba3c-387e6a708f86"
ORIGEN = "IMPORTACION_HISTORICA_2026"
BATCH_SIZE = 100

CATEGORIA_GASTO_NOMBRE = {
    "Comision": "Comisión bancaria (histórico)",
    "Compras": "Compras (histórico)",
    "Nomina": "Nómina (histórico)",
    "Gastos de Operacion": "Gastos de Operación (histórico)",
    "Gastos Fijos": "Gastos Fijos (histórico)",
    "Nomina Socio": "Nómina Socio (histórico)",
    "NominA Socio": "Nómina Socio (histórico)",
    "Mantenimiento": "Mantenimiento",
    "Impuestos": "Impuestos (histórico)",
    "Propinas Tarjeta": "Propinas Tarjeta (histórico)",
    "Marketing": "Marketing",
    "Material y Equipo": "Material y Equipo (histórico)",
    "Otros": "Otros",
    "Ahorro": "Ahorro (histórico)",
    "Remodelacion": "Remodelación (histórico)",
    "Uniformes": "Uniformes (histórico)",
}


def esc(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"


def num(n):
    return repr(round(float(n), 2))


def batches(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


def write_chunk(prefix, idx, sql):
    path = os.path.join(CHUNKS, f"{prefix}_{idx:02d}.sql")
    with open(path, "w") as f:
        f.write(sql)
    return path


chunk_files = []

# ---------------------------------------------------------------------
# 1) movimientos_bancarios (Movimiento == 'Banco')
# ---------------------------------------------------------------------
banco_rows = [r for r in regs if r["movimiento"] == "Banco"]
chunk_files.append(
    write_chunk(
        "01_bancos",
        0,
        "insert into public.movimientos_bancarios "
        "(cuenta_id, fecha, concepto, referencia, cargo, abono, tipo_movimiento, beneficiario, notas) values\n"
        f"('{CUENTA_ID}', '2026-01-01', 'Saldo inicial (apertura histórica)', 'Saldo Inicial', 0, 159746.69, "
        f"'apertura_saldo_inicial', NULL, 'Importación histórica 2026 — saldo inicial al 01/01/2026');\n",
    )
)
for i, batch in enumerate(batches(banco_rows, BATCH_SIZE), start=1):
    values = []
    for r in batch:
        cargo = num(r["monto"]) if r["tipo"] == "egreso" else "0"
        abono = num(r["monto"]) if r["tipo"] == "ingreso" else "0"
        values.append(
            f"('{CUENTA_ID}', '{r['fecha']}', {esc(r['descripcion'])}, {esc(r['subcategoria'])}, "
            f"{cargo}, {abono}, {esc(r['categoria'])}, {esc(r['descripcion'])}, "
            f"'Importación histórica 2026 ({r['mes']})')"
        )
    sql = (
        "insert into public.movimientos_bancarios "
        "(cuenta_id, fecha, concepto, referencia, cargo, abono, tipo_movimiento, beneficiario, notas) values\n"
        + ",\n".join(values)
        + ";\n"
    )
    chunk_files.append(write_chunk("01_bancos", i, sql))

# ---------------------------------------------------------------------
# 2) movimientos_caja (Movimiento == 'Efectivo')
# ---------------------------------------------------------------------
efectivo_rows = [r for r in regs if r["movimiento"] == "Efectivo"]
chunk_files.append(
    write_chunk(
        "02_caja",
        0,
        "insert into public.movimientos_caja (caja_id, fecha, tipo_movimiento, importe, notas) values\n"
        f"('{CAJA_ID}', '2026-01-01', 'entrada', 3292.80, "
        f"'Importación histórica 2026 — saldo inicial en efectivo al 01/01/2026');\n",
    )
)
for i, batch in enumerate(batches(efectivo_rows, BATCH_SIZE), start=1):
    values = []
    for r in batch:
        if r["tipo"] == "ingreso":
            tipo_mov = "venta_efectivo" if r["categoria"] == "Ventas" else "entrada"
        else:
            tipo_mov = "gasto"
        notas = f"{r['categoria']} / {r['subcategoria']} — {r['descripcion']} — Importación histórica 2026 ({r['mes']})"
        values.append(f"('{CAJA_ID}', '{r['fecha']}', '{tipo_mov}', {num(r['monto'])}, {esc(notas)})")
    sql = (
        "insert into public.movimientos_caja (caja_id, fecha, tipo_movimiento, importe, notas) values\n"
        + ",\n".join(values)
        + ";\n"
    )
    chunk_files.append(write_chunk("02_caja", i, sql))

# ---------------------------------------------------------------------
# 3) gastos (todas las filas Egreso, banco + efectivo)
# ---------------------------------------------------------------------
egreso_rows = [r for r in regs if r["tipo"] == "egreso"]
for i, batch in enumerate(batches(egreso_rows, BATCH_SIZE), start=1):
    values = []
    for r in batch:
        cat_nombre = CATEGORIA_GASTO_NOMBRE.get(r["categoria"], "Otros")
        forma_pago_sql = (
            "(select id from public.formas_pago where tipo = 'efectivo')"
            if r["movimiento"] == "Efectivo"
            else "NULL"
        )
        observacion = f"orig: {r['categoria']}/{r['subcategoria']} ({r['movimiento']})"
        values.append(
            "(SELECT id FROM public.categorias_gastos WHERE nombre = "
            f"{esc(cat_nombre)}), '{r['fecha']}', {esc(r['descripcion'])}, "
            f"'{SUCURSAL_ID}', {num(r['monto'])}, 0, {forma_pago_sql}, 'pagada', "
            f"{esc(observacion)}, '{ORIGEN}'"
        )
    sql = (
        "insert into public.gastos "
        "(categoria_gasto_id, fecha, concepto, sucursal_id, subtotal, impuestos, forma_pago_id, "
        "estatus_pago, observacion, origen) values\n"
        + ",\n".join(f"({v})" for v in values)
        + ";\n"
    )
    chunk_files.append(write_chunk("03_gastos", i, sql))

print(f"Generados {len(chunk_files)} archivos en {CHUNKS}")
for p in chunk_files:
    print(" -", os.path.basename(p), os.path.getsize(p), "bytes")
