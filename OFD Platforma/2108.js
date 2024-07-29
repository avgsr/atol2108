var fileNameCSV = "C:\\tmp\\file.csv"; //"./file.csv";
var delim = ";"; //"\t"; //разделитель
var Cashir = "Администратор";  //кассир
var CorT = 1; //0 сами, 1 по предписанию 1173
var Predp = "№ предписания"; //1179
//var Sno = Fptr.LIBFPTR_TT_OSN; // - общая;
//var Sno = Fptr.LIBFPTR_TT_USN_INCOME; // - упрощенная доход;
var Sno = Fptr.LIBFPTR_TT_USN_INCOME_OUTCOME; // - упрощенная доход минус расход;
//var Sno = Fptr.LIBFPTR_TT_PATENT; // - патентная система налогообложения.
var t2108 = 11; // 0 шт , 11 кг, ...
//платформа тов.позиции
//0РНМ			1Номер ФН		2Адрес расчетов (тег 1009)			
//3ФП		4Ном д	5Тип ФД		6Пр рсч	7Дата/время		8№см	9Наименование		10ПрПрР	11Итого по чеку	12Нал		13Эл	
//1234567890	870	Кассовый чек	Приход	03.06.2024 10:59	91	наименование товара	ТОВАР	61448.87	51448.87	0.00	
//14аванс	15Зачет 16кредитами	17Встречными	18Цена	19Кол	20Номер товара в чеке	21Сумма без НДС по чеку	22Сумма НДС 0% по чеку	23Сумма НДС 10% по чеку	24Сумма НДС 20% по чеку	
//0.00		0.00	10000.00	0.00		600.00	6.00	1			61448.87		0.00			0.00			0.00	
//25НДС10/110%	26НДС18/118%	27НДС20/120%	28Сумма товара	29Пр способа расчета		30Ставка НДС по товару	31Сумма НДС по товару	Признак агента по предмету расчета (тег 1222)	ИНН поставщика	Наименование поставщика (тег 1225)
//0.00		0.00		0.00		3600.00		ЧАСТИЧНЫЙ РАСЧЕТ И КРЕДИТ	-			0.00			
var col = {"fp":3,"sh":8,"dt":7,"tr":6,"ch":12,"el":13,"kr":16,"av":14,"az":15,"it":11,"sr":29,"p2":10,"nm":9,"pr":18,"qn":19,"sm":28};
var fileNameLog = "C:\\tmp\\log.txt"; 

var res = "OK";
var oldFd = ""; //чек

var flog = FileOpen(fileNameLog,"w"); 
if (!flog.isValid) { return "Error open log";}
var file = FileOpen(fileNameCSV,"r");
if (!file.isValid) { return "Error open file";}

var logstr="";
var str = FileReadLine(file);
var arStr = str.split(delim);
while (str != null) { //пока не конец файла
	if (oldFd != arStr[col.fp]) { //новый чек
		var curRec = {}; //новый чек
		curRec.tr = 0;
		if (arStr[col.tr] == "Приход") curRec.tr = Fptr.LIBFPTR_RT_SELL_CORRECTION;
		//if (arStr[col.tr] == "Возврат Прихода") curRec.tr = LIBFPTR_RT_SELL_RETURN_CORRECTION;
		if (curRec.tr ==0 ) {
			logstr = ""+arStr[col.fp]+" "+arStr[col.tr]+"\n";
			FileWrite(flog,logstr);
			res="ОШИБК";
			while(oldFd == arStr[col.fp]) {
				str = FileReadLine(file);
				if (str == null) break;
				arStr = str.split(delim);
			} 
			continue;
		}
		curRec.data = d2dt(arStr[col.dt]);
		curRec.cash = +Number(arStr[col.ch]).toFixed(2);
		curRec.elec = +Number(arStr[col.el]).toFixed(2);
		curRec.kred = +Number(arStr[col.kr]).toFixed(2);
		curRec.avan = +Number(arStr[col.av]).toFixed(2);
		curRec.avzt = +Number(arStr[col.az]).toFixed(2); //[p
		curRec.sum  = +Number(arStr[col.it]).toFixed(2); 
		if (curRec.sum-curRec.avan-curRec.kred-curRec.elec-curRec.cash !=0 ) {
			logstr = ""+arStr[col.fp]+" итог суммы не идут \n";
			FileWrite(flog,logstr);
			res="ОШИБК";
			while(oldFd == arStr[col.fp]) {
				str = FileReadLine(file);
				if (str == null) break;
				arStr = str.split(delim);
			} 
			continue;
		}
		curRec.coms = []; //товары

		oldFd = arStr[col.fp];
	}
	while (oldFd == arStr[col.fp]) { //по чеку по товарам
		var com = {};
		com.nm = arStr[col.nm];
		//Fptr.logWrite('FiscalPrinter', Fptr.LIBFPTR_LOG_INFO,oldFd+com.nm);
		com.p2 = 0;
		if (arStr[col.p2] == "ТОВАР") com.p2 = 1;
		if (arStr[col.p2] == "ПЛАТЕЖ") com.p2 = 10;
		if (com.p2 ==0 ) {
			logstr = ""+oldFd+" "+arStr[col.p2]+"\n";
			FileWrite(flog,logstr);
			res="ОШИБК";
			while(oldFd == arStr[col.fp]) {
				str = FileReadLine(file);
				if (str == null) break;
				arStr = str.split(delim);
			} 
			continue;
		}
		com.sr = 0;
		if (arStr[col.sr] == "ПОЛНЫЙ РАСЧЕТ") com.sr = 4;
		if (arStr[col.sr] == "ЧАСТИЧНЫЙ РАСЧЕТ И КРЕДИТ") com.sr = 5;
		if (arStr[col.sr] == "ОПЛАТА КРЕДИТА") com.sr = 7;
		if (com.sr ==0 ) {
			logstr = ""+oldFd+" "+arStr[col.sr]+"\n";
			FileWrite(flog,logstr);
			res="ОШИБК";
			while(oldFd == arStr[col.fp]) {
				str = FileReadLine(file);
				if (str == null) break;
				arStr = str.split(delim);
			} 
			continue;
		}
		com.pr = +Number(arStr[col.pr]).toFixed(2);
		com.qn = +Number(arStr[col.qn]).toFixed(2);
		com.sm = +Number(arStr[col.sm]).toFixed(2);
		if ((com.pr ==0 )||(com.qn ==0)) {
			logstr = ""+oldFd+" кол или цена 0"+"\n";
			FileWrite(flog,logstr);
			res="ОШИБК";
			while(oldFd == arStr[col.fp]) {
				str = FileReadLine(file);
				if (str == null) break;
				arStr = str.split(delim);
			} 
			continue;
		}
		curRec.coms[curRec.coms.length] = com;
		str = FileReadLine(file);
		if (str == null) break;
		arStr = str.split(delim);
	}
	var msg ="";
	msg = rec2fptr(curRec); //пошла фискализация
	if (msg != "") {
		logstr = ""+oldFd+" "+msg+"\n";
		FileWrite(flog,logstr);
		res="ОШИБК";
	}
}
if (FileClose(file) != 0) return "Error close file";
if (FileClose(flog) != 0) return "Error close log";
return res;

function d2dt(sdat) { //20.06.2024 12:15 
	var y = sdat[6]+sdat[7]+sdat[8]+sdat[9];
	var m = sdat[3]+sdat[4];
	var d = sdat[0]+sdat[1];
	var h = sdat[11]+sdat[12];
	var mi = sdat[14]+sdat[15];
	var dt = new Date(y,m,d,h,mi); 
	return dt;
}

function rec2fptr(rec) {
	var msg="";
	Fptr.setParam(1021, Cashir); //кассир
	Fptr.operatorLogin(); //

	Fptr.setParam(1178, rec.data); /* тег 1178 - "Дата совершения корректируемого расчета"*/
	Fptr.setParam(1179, Predp); /* тег 1179 - «Номер документа основания для коррекции»,  */
	Fptr.utilFormTlv(); /* Выполняем метод utilFormTlv() для формирования составного тега 1174 из тегов 1177, 1178, 1179 */
	correctionInfo = Fptr.getParamByteArray(Fptr.LIBFPTR_PARAM_TAG_VALUE); /* забираем результат (массив байтов для тега 1174) в LIBFPTR_PARAM_TAG_VALUE */

	Fptr.setParam(1055, Sno); 
	Fptr.setParam(Fptr.LIBFPTR_PARAM_RECEIPT_TYPE, rec.tr); //корректируем
	Fptr.setParam(1174, correctionInfo); /* записываем собранный массив байтов в тег 1174 */
	Fptr.setParam(1173, CorT); /* тег 1173 - "Тип коррекции", 0 сами,1 принудительно */
	Fptr.setParam(1192,rec.fp); //указав фискальный признак ошибочного чека (по тегу 1192 «дополнительные реквизиты чека»).
	Fptr.setParam(Fptr.LIBFPTR_PARAM_RECEIPT_ELECTRONICALLY, true); /* Чтобы чек не печатался (электронный чек), нужно установить параметру LIBFPTR_PARAM_RECEIPT_ELECTRONICALLY значение true. */
	var res = Fptr.openReceipt();
	if (res<0) {
		msg = Fptr.errorDescription();
		Fptr.cancelReceipt();
		return msg;
	}
	for (var i = 0; i < rec.coms.length; i++) {
		var com = rec.coms[i];
		Fptr.setParam(Fptr.LIBFPTR_PARAM_COMMODITY_NAME, com.nm); /* LIBFPTR_PARAM_COMMODITY_NAME - название товара */
		Fptr.setParam(Fptr.LIBFPTR_PARAM_PRICE, com.pr); /* LIBFPTR_PARAM_PRICE - цена за единицу */ 
		Fptr.setParam(Fptr.LIBFPTR_PARAM_QUANTITY, com.qn); /* LIBFPTR_PARAM_QUANTITY - количество единиц товара */
		Fptr.setParam(Fptr.LIBFPTR_PARAM_POSITION_SUM,com.sm);//полная сумма позиции. Может отличаться от произведения цены на количество. В этом случае ККТ разобьет позицию на две, распределив получившуюся разницу (скидку или надбавку) между позициями.
		Fptr.setParam(Fptr.LIBFPTR_PARAM_TAX_TYPE, Fptr.LIBFPTR_TAX_NO); /* LIBFPTR_PARAM_TAX_TYPE - номер налоговой ставки, LIBFPTR_TAX_NO - не облагается */
		Fptr.setParam(1212, com.p2); /* тег 1212	Признак предмета расчета*/
		Fptr.setParam(1214, com.sr); /* тег 1214	Признак способа рaсчета*/
		//gплатеж в штуках, товар в ...
		Fptr.setParam(2108, (com.p2==10)?0:t2108); /*2108	Мера количества предмета расчета	int	≥ 1.2*/
		Fptr.registration(); /* выполняем метод registration() для регистрации позиции */
	}
	if (rec.elec != 0 ){
		Fptr.setParam(Fptr.LIBFPTR_PARAM_PAYMENT_TYPE, Fptr.LIBFPTR_PT_ELECTRONICALLY); /* LIBFPTR_PT_ELECTRONICALLY - безналичными;*/
		Fptr.setParam(Fptr.LIBFPTR_PARAM_PAYMENT_SUM, rec.elec); /* LIBFPTR_PARAM_PAYMENT_SUM - сумму расчета */
		Fptr.payment(); /* выполняем метод payment() для регистрации оплаты чека */
	}
	if (rec.kred != 0 ){
		Fptr.setParam(Fptr.LIBFPTR_PARAM_PAYMENT_TYPE, Fptr.LIBFPTR_PT_CREDIT);
		Fptr.setParam(Fptr.LIBFPTR_PARAM_PAYMENT_SUM, rec.kred);
		Fptr.payment();
	}
	if (rec.avan != 0 ){
		Fptr.setParam(Fptr.LIBFPTR_PARAM_PAYMENT_TYPE, Fptr.LIBFPTR_PT_PREPAID);
		Fptr.setParam(Fptr.LIBFPTR_PARAM_PAYMENT_SUM, rec.avan);
		Fptr.payment();
	}
	if (rec.cash != 0 ){ //нал последним?
		Fptr.setParam(Fptr.LIBFPTR_PARAM_PAYMENT_TYPE, Fptr.LIBFPTR_PT_CASH); /* LIBFPTR_PARAM_PAYMENT_TYPE - способ расчета, LIBFPTR_PT_CASH - наличными */
		Fptr.setParam(Fptr.LIBFPTR_PARAM_PAYMENT_SUM, rec.cash); /* LIBFPTR_PARAM_PAYMENT_SUM - сумму расчета */
		Fptr.payment(); /* выполняем метод payment() для регистрации оплаты чека */
	}
	res = Fptr.closeReceipt(); /* выполняем метод closeReceipt() для закрытия чека */
	if (res<0) {
		msg = Fptr.errorDescription();
		Fptr.cancelReceipt();
	}
	return msg;
}