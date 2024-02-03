var fileNameCSV = "C:\\tmp\\file.csv"; //"./file.csv"; /// utf8
var delim = ";"; 
var Cashir = "Сис. админ.";

var file = FileOpen(fileNameCSV,"r");
if (!file.isValid) { return "Error open file";}
var msg = "";
var recs = file2recs(file); // чеки гр. по нмеру смены
if (msg != "") {
	FileClose(file);
	return msg;
}
for (var i = 0; i < recs.length; i++) {
	res = rec2fptr(recs[i]);
	if (!res) {
		FileClose(file);
		return msg;
	}
}
if (FileClose(file) != 0) {
    return "Error close file";
}

function file2recs(file) {
//0 123123;1 573;2 2020-01-30T21:55;3 Приход.;4 35;5 0;6 Товар;7 Наим Товара;8 35.00;9 1
	var col = {"fd":0,"sh":1,"dt":2,"tr":3,"ch":4,"el":5,"p2":6,"nm":7,"pr":8,"qn":9};
	var res = [];
	var oldSh = "";
	var oldFd = "";
	var j = 0;
	var str = FileReadLine(file);
	var arStr = str.split(delim);
	while (str != null) {
		if (oldSh != arStr[col.sh]) {
			var curRec = {}; //новый чек
			curRec.shnm = arStr[col.sh];
			curRec.data = new Date(arStr[col.dt]);
			curRec.cash = 0;
			curRec.elec = 0;
			curRec.coms = [];
			oldSh = arStr[col.sh];
		}
		while (oldSh == arStr[col.sh]) {
			if (oldFd != arStr[col.fd]) {
				var k = (arStr[col.tr] == "Приход.") ? 1 : -1; //приход +, возврат прихода -
				curRec.cash += new Number(arStr[col.ch])*k;
				curRec.elec += new Number(arStr[col.el])*k;
				oldFd = arStr[col.fd];
			}
			while (oldFd == arStr[col.fd]) {
				var newCom = true;
				for (var i = 0; i < curRec.coms.length; i++) {
					if (curRec.coms[i].nm+curRec.coms[i].pr == arStr[col.nm]+arStr[col.pr]) { 
						curRec.coms[i].qn += arStr[col.qn]*k;
						newCom = false;
					}
				}
				if (newCom) {
					var com = {};
					com.p2 = (arStr[col.p2] == "Товар") ? 1 : 4; // или услуга
					com.nm = arStr[col.nm];
					com.pr = new Number(arStr[col.pr]);
					com.qn = k*new Number(arStr[col.qn]);
					curRec.coms[curRec.coms.length] = com;
				}
				str = FileReadLine(file);
				if (str != null) {arStr = str.split(delim);}
				if (str == null) break;
			}
			if (str == null) break;
		}
		res[j++] = curRec;
	}
	return res;
}

function rec2fptr(rec) {
	Fptr.setParam(1021, Cashir); //кассир
	Fptr.operatorLogin(); //

	Fptr.setParam(1178, new Date(rec.data)); /* тег 1178 - "Дата совершения корректируемого расчета"*/
	Fptr.setParam(1179, 'смена '+rec.shnm); /* тег 1179 - «Номер документа основания для коррекции»,  */
	Fptr.utilFormTlv(); /* Выполняем метод utilFormTlv() для формирования составного тега 1174 из тегов 1177, 1178, 1179 */
	correctionInfo = Fptr.getParamByteArray(Fptr.LIBFPTR_PARAM_TAG_VALUE); /* забираем результат (массив байтов для тега 1174) в LIBFPTR_PARAM_TAG_VALUE */

	Fptr.setParam(1055, Fptr.LIBFPTR_TT_PATENT); //сно патент
	Fptr.setParam(Fptr.LIBFPTR_PARAM_RECEIPT_TYPE, Fptr.LIBFPTR_RT_SELL_CORRECTION); //корректируем
	Fptr.setParam(1174, correctionInfo); /* записываем собранный массив байтов в тег 1174 */
	Fptr.setParam(1173, 0); /* тег 1173 - "Тип коррекции", 0 сами,1 принудительно */
	//Fptr.setParam(1192,""); //указав фискальный признак ошибочного чека (по тегу 1192 «дополнительные реквизиты чека»).
	Fptr.setParam(Fptr.LIBFPTR_PARAM_RECEIPT_ELECTRONICALLY, true); /* Чтобы чек не печатался (электронный чек), нужно установить параметру LIBFPTR_PARAM_RECEIPT_ELECTRONICALLY значение true. */
	var res = Fptr.openReceipt();
	if (res<0) {
		msg = Fptr.errorDescription();
		Fptr.cancelReceipt();
		return false;
	}
	for (var i = 0; i < rec.coms.length; i++) {
		var com = rec.coms[i];
		Fptr.setParam(Fptr.LIBFPTR_PARAM_COMMODITY_NAME, com.nm); /* LIBFPTR_PARAM_COMMODITY_NAME - название товара */
		Fptr.setParam(Fptr.LIBFPTR_PARAM_PRICE, 1.00*com.pr); /* LIBFPTR_PARAM_PRICE - цена за единицу */ 
		//Fptr.logWrite('FiscalPrinter', Fptr.LIBFPTR_LOG_INFO,com.qn);
		Fptr.setParam(Fptr.LIBFPTR_PARAM_QUANTITY, 1.00*com.qn); /* LIBFPTR_PARAM_QUANTITY - количество единиц товара */
		Fptr.setParam(Fptr.LIBFPTR_PARAM_TAX_TYPE, Fptr.LIBFPTR_TAX_NO); /* LIBFPTR_PARAM_TAX_TYPE - номер налоговой ставки, LIBFPTR_TAX_NO - не облагается */
		Fptr.setParam(1212, com.p2); /* тег 1212	Признак предмета расчета*/
		Fptr.setParam(2108, 0); /*2108	Мера количества предмета расчета	int	≥ 1.2*/
		Fptr.registration(); /* выполняем метод registration() для регистрации позиции */
	}
	if (rec.cash != 0 ){
		Fptr.setParam(Fptr.LIBFPTR_PARAM_PAYMENT_TYPE, Fptr.LIBFPTR_PT_CASH); /* LIBFPTR_PARAM_PAYMENT_TYPE - способ расчета, LIBFPTR_PT_CASH - наличными */
		Fptr.setParam(Fptr.LIBFPTR_PARAM_PAYMENT_SUM, rec.cash); /* LIBFPTR_PARAM_PAYMENT_SUM - сумму расчета */
		Fptr.payment(); /* выполняем метод payment() для регистрации оплаты чека */
	}
	if (rec.elec != 0 ){
		Fptr.setParam(Fptr.LIBFPTR_PARAM_PAYMENT_TYPE, Fptr.LIBFPTR_PT_ELECTRONICALLY); /* LIBFPTR_PT_ELECTRONICALLY - безналичными;*/
		Fptr.setParam(Fptr.LIBFPTR_PARAM_PAYMENT_SUM, rec.elec); /* LIBFPTR_PARAM_PAYMENT_SUM - сумму расчета */
		Fptr.payment(); /* выполняем метод payment() для регистрации оплаты чека */
	}
	res = Fptr.closeReceipt(); /* выполняем метод closeReceipt() для закрытия чека */
	if (res<0) {
		msg = Fptr.errorDescription();
		Fptr.cancelReceipt();
		return false;
	}
	return true;
}
