function $(id){return document.getElementById(id)}

function formatCurrency(n){
  return n.toLocaleString('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:2});
}

function round2(n){return Math.round((n+Number.EPSILON)*100)/100}

function calculateFrench(C, annualRate, years, m){
  const N = Math.round(years * m);
  const r = annualRate / 100 / m;
  const A = r === 0 ? C / N : C * (r / (1 - Math.pow(1 + r, -N)));
  let balance = C;
  const schedule = [];
  for(let k=1;k<=N;k++){
    let interest = balance * r;
    let principal = A - interest;
    if(principal > balance) {
      principal = balance;
      interest = A - principal;
    }
    balance = balance - principal;
    schedule.push({period:k,payment:round2(A),principal:round2(principal),interest:round2(interest),balance:round2(Math.max(0,balance))});
  }
  return schedule;
}

function calculateGerman(C, annualRate, years, m){
  const N = Math.round(years * m);
  const r = annualRate / 100 / m;
  const amort = C / N;
  let balance = C;
  const schedule = [];
  for(let k=1;k<=N;k++){
    let interest = balance * r;
    let principal = amort;
    if(principal > balance) principal = balance;
    let payment = principal + interest;
    balance = balance - principal;
    schedule.push({period:k,payment:round2(payment),principal:round2(principal),interest:round2(interest),balance:round2(Math.max(0,balance))});
  }
  return schedule;
}

function validateInputs(C, rate, years, m){
  const errors = [];
  if(!isFinite(C) || C<=0) errors.push('Monto del crédito debe ser un número mayor a 0.');
  if(!isFinite(rate) || rate<0) errors.push('Tasa de interés debe ser un número >= 0.');
  if(!isFinite(years) || years<=0) errors.push('Tiempo en años debe ser un número mayor a 0.');
  if(!Number.isInteger(m) || m<=0) errors.push('Pagos por año (m) debe ser un entero mayor a 0.');
  return errors;
}

function renderSchedule(schedule, container, tableType){
  container.innerHTML = '';
  const card = document.createElement('div'); card.className='card';
  const title = document.createElement('h3'); title.textContent = `Tabla ${tableType === 'francesa' ? 'Francesa (cuotas constantes)' : 'Alemana (amortización constante)'} `;
  card.appendChild(title);

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th class="col-left">#</th><th>Cuota</th><th>Capital</th><th>Interés</th><th>Saldo</th></tr>';
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  let totalPayments=0, totalPrincipal=0, totalInterest=0;
  schedule.forEach(row=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="col-left">${row.period}</td><td>${formatCurrency(row.payment)}</td><td>${formatCurrency(row.principal)}</td><td>${formatCurrency(row.interest)}</td><td>${formatCurrency(row.balance)}</td>`;
    tbody.appendChild(tr);
    totalPayments += row.payment;
    totalPrincipal += row.principal;
    totalInterest += row.interest;
  });
  table.appendChild(tbody);

  const tfoot = document.createElement('tfoot');
  tfoot.innerHTML = `<tr class="totals"><td class="col-left">Totales</td><td>${formatCurrency(round2(totalPayments))}</td><td>${formatCurrency(round2(totalPrincipal))}</td><td>${formatCurrency(round2(totalInterest))}</td><td></td></tr>`;
  table.appendChild(tfoot);

  card.appendChild(table);
  
  const btnDiv = document.createElement('div');
  btnDiv.style.marginTop = '12px';
  btnDiv.style.textAlign = 'center';
  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Exportar a Excel';
  exportBtn.type = 'button';
  exportBtn.className = 'secondary';
  exportBtn.style.display = 'inline-block';
  exportBtn.style.minWidth = '180px';
  exportBtn.addEventListener('click', ()=>{
    exportToExcel(schedule, tableType);
  });
  btnDiv.appendChild(exportBtn);
  card.appendChild(btnDiv);
  
  container.appendChild(card);
}

function exportToExcel(schedule, tableType){
  const ws_name = 'Cronograma';
  const wb = XLSX.utils.book_new();
  const data = [
    ['Cronograma de Pagos - Tabla ' + (tableType === 'francesa' ? 'Francesa' : 'Alemana')],
    [],
    ['Período', 'Cuota', 'Capital', 'Interés', 'Saldo']
  ];
  schedule.forEach(row=>{
    data.push([row.period, row.payment, row.principal, row.interest, row.balance]);
  });
  let totalPayments=0, totalPrincipal=0, totalInterest=0;
  schedule.forEach(row=>{totalPayments+=row.payment;totalPrincipal+=row.principal;totalInterest+=row.interest;});
  data.push(['Totales', totalPayments, totalPrincipal, totalInterest, '']);
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, ws_name);
  XLSX.writeFile(wb, 'Cronograma_Credito.xlsx');
}

window.addEventListener('DOMContentLoaded',()=>{
  const amount = $('amount');
  const rate = $('rate');
  const years = $('years');
  const paymentsPerYear = $('paymentsPerYear');
  const calculateBtn = $('calculateBtn');
  const results = $('results');
  const error = $('error');

  document.querySelectorAll('.no-e').forEach(input=>{
    input.addEventListener('keypress',e=>{
      if(e.key.toLowerCase()==='e') e.preventDefault();
    });
  });

  calculateBtn.addEventListener('click',()=>{
    error.textContent = '';
    results.innerHTML = '';
    const C = parseFloat(amount.value);
    const i = parseFloat(rate.value);
    const y = parseFloat(years.value);
    const m = parseInt(paymentsPerYear.value,10);
    const tableType = document.querySelector('input[name="tableType"]:checked').value;

    const errors = validateInputs(C,i,y,m);
    if(errors.length){
      error.innerHTML = errors.map(e=>`<div>${e}</div>`).join('');
      return;
    }

    let schedule = [];
    if(tableType === 'francesa') schedule = calculateFrench(C,i,y,m);
    else schedule = calculateGerman(C,i,y,m);

    renderSchedule(schedule, results, tableType);
  });
});