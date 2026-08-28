"""
Parseo y validación del histórico de Ingresos y Egresos (Madero) Ene-Mar 2026.
Genera:
  - out/checksum.json  (totales por mes para validar contra los pivotes originales)
  - out/movimientos_bancarios.sql
  - out/movimientos_caja.sql
  - out/gastos.sql
No escribe nada a Supabase; solo genera SQL para revisión/ejecución posterior.
"""
import json
import os
import uuid
import openpyxl
from datetime import datetime

BASE = "/root/.claude/uploads/3351af35-0dbe-5bd4-a52d-be5d949f3bd3"
FILES = [
    ("ENERO", f"{BASE}/cbf41ee4-INGRESOS_EGRESOS_ENERO_206.xlsx", "RESUMEN"),
    ("FEBRERO", f"{BASE}/a63029e8-INGRESOS_Y_EGRESOS_FEBRERO_2026.xlsx", "Base de Datos"),
    ("MARZO", f"{BASE}/9988edf8-MARZO_INGRESOS_Y_EGRESO.xlsx", "CONCENTRADO"),
]
OUT = os.path.join(os.path.dirname(__file__), "out")
os.makedirs(OUT, exist_ok=True)

# Mapeo Categoria (fuente) -> nombre categorias_gastos (ya existentes o nuevas)
CATEGORIA_GASTO_NOMBRE = {
    "Comision": "Comisión bancaria (histórico)",
    "Compras": "Compras (histórico)",
    "Nomina": "Nómina (histórico)",
    "Gastos de Operacion": "Gastos de Operación (histórico)",
    "Gastos Fijos": "Gastos Fijos (histórico)",
    "Nomina Socio": "Nómina Socio (histórico)",
    "Mantenimiento": "Mantenimiento",  # existente
    "Impuestos": "Impuestos (histórico)",
    "Propinas Tarjeta": "Propinas Tarjeta (histórico)",
    "Marketing": "Marketing",  # existente
    "Material y Equipo": "Material y Equipo (histórico)",
    "Otros": "Otros",  # existente
    "Ahorro": "Ahorro (histórico)",
    "Remodelacion": "Remodelación (histórico)",
    "Uniformes": "Uniformes (histórico)",
}
CATEGORIA_TIPO = {
    "Comisión bancaria (histórico)": "variable",
    "Compras (histórico)": "variable",
    "Nómina (histórico)": "fijo",
    "Gastos de Operación (histórico)": "operativo",
    "Gastos Fijos (histórico)": "fijo",
    "Nómina Socio (histórico)": "fijo",
    "Impuestos (histórico)": "fijo",
    "Propinas Tarjeta (histórico)": "variable",
    "Material y Equipo (histórico)": "variable",
    "Ahorro (histórico)": "administrativo",
    "Remodelación (histórico)": "variable",
    "Uniformes (histórico)": "variable",
}

def parse_fecha(fecha, anio_col):
    """Casi todas las celdas son datetime; algunas traen errores de captura:
    - texto DD/MM/AAAA con un dígito de más en el año (ej. '16/01/20256')
    - celdas datetime válidas pero con el año mal tecleado al capturar
      (ej. 2023-02-23 o 2028-02-27 en vez de 2026-02-23/2026-02-27)
    En ambos casos se corrige el año usando la columna 'Año' de la misma
    fila (siempre 2026, consistente en las 3 fuentes) — nunca se inventa
    una fecha distinta, solo se usa el otro dato ya presente en la fila."""
    if isinstance(fecha, datetime):
        if anio_col and fecha.year != int(anio_col):
            return fecha.replace(year=int(anio_col)).date()
        return fecha.date()
    if isinstance(fecha, str):
        parts = fecha.strip().split("/")
        if len(parts) == 3:
            day, month, year_str = parts
            year = int(year_str) if len(year_str) == 4 else int(anio_col)
            if anio_col and year != int(anio_col):
                year = int(anio_col)
            return datetime(year, int(month), int(day)).date()
    raise ValueError(f"Fecha no reconocida: {fecha!r}")

def norm_tipo(t):
    if t in ("Ingreso", "Ingresos"):
        return "ingreso"
    if t == "Egreso":
        return "egreso"
    return None

def esc(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"

def num(n):
    if n is None:
        return "0"
    return repr(round(float(n), 2))

registros = []
saldos_iniciales = []
checksum = {}

for mes, path, sheet in FILES:
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb[sheet]
    ing_total = 0.0
    egr_total = 0.0
    skipped_zero = 0
    skipped_blank = 0
    for row in ws.iter_rows(min_row=2, values_only=True):
        tipo, fecha, mes_txt, anio, desc, ingresos, egresos, categoria, subcategoria, empresa, movimiento = row
        if fecha is None or empresa is None:
            skipped_blank += 1
            continue
        fecha_norm = parse_fecha(fecha, anio)
        if tipo == "Saldo Inicial":
            saldos_iniciales.append({
                "mes": mes, "fecha": fecha_norm.isoformat(), "monto": float(ingresos or 0),
                "movimiento": movimiento,
            })
            continue
        t = norm_tipo(tipo)
        if t is None:
            skipped_blank += 1
            continue
        monto = float(ingresos or 0) if t == "ingreso" else float(egresos or 0)
        if monto == 0:
            skipped_zero += 1
            continue
        if t == "ingreso":
            ing_total += monto
        else:
            egr_total += monto
        registros.append({
            "mes": mes,
            "fecha": fecha_norm.isoformat(),
            "tipo": t,
            "monto": monto,
            "descripcion": desc or "",
            "categoria": categoria or "Otros",
            "subcategoria": subcategoria or "",
            "movimiento": movimiento,
        })
    checksum[mes] = {
        "ingresos_calculados": round(ing_total, 2),
        "egresos_calculados": round(egr_total, 2),
        "filas_omitidas_monto_cero": skipped_zero,
        "filas_omitidas_sin_datos": skipped_blank,
    }

with open(os.path.join(OUT, "checksum.json"), "w") as f:
    json.dump({"checksum": checksum, "saldos_iniciales": saldos_iniciales,
               "total_registros": len(registros)}, f, indent=2, ensure_ascii=False)

print(json.dumps(checksum, indent=2, ensure_ascii=False))
print("Saldos iniciales:", saldos_iniciales)
print("Total registros a importar (excluye saldo inicial y ceros):", len(registros))

with open(os.path.join(OUT, "registros.json"), "w") as f:
    json.dump(registros, f, ensure_ascii=False)
