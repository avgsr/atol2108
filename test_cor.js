var res  = Fptr.setParam(1021, "Сис. админ."); //кассир
if (res < 0) {return "каассир "+Fptr.errorDescription()};
res = Fptr.operatorLogin(); //
if (res < 0) {return "логин "+Fptr.errorDescription()};

res = Fptr.setParam(1178, new Date("2024-02-03T00:00")); /* тег 1178 - "Дата совершения корректируемого расчета"*/
if (res < 0) {return "дат "+Fptr.errorDescription()};
res = Fptr.setParam(1179, "---"); //rec.shnm); /* тег 1179 - «Номер документа основания для коррекции»,  */
if (res < 0) {return "но кор "+Fptr.errorDescription()};
res = Fptr.utilFormTlv(); /* Выполняем метод utilFormTlv() для формирования составного тега 1174 из тегов 1177, 1178, 1179 */
if (res < 0) {return "сост "+Fptr.errorDescription()};
correctionInfo = Fptr.getParamByteArray(Fptr.LIBFPTR_PARAM_TAG_VALUE); /* забираем результат (массив байтов для тега 1174) в LIBFPTR_PARAM_TAG_VALUE */

res = Fptr.setParam(1055, Fptr.LIBFPTR_TT_PATENT); //сно патент
if (res < 0) {return "сно "+Fptr.errorDescription()};

res = Fptr.setParam(Fptr.LIBFPTR_PARAM_RECEIPT_TYPE, Fptr.LIBFPTR_RT_SELL_CORRECTION); //корректируем
//res = Fptr.setParam(Fptr.LIBFPTR_PARAM_RECEIPT_TYPE, Fptr.LIBFPTR_RT_SELL_RETURN_CORRECTION); //корректируем
if (res < 0) {return "тип чека "+Fptr.errorDescription()};
res = Fptr.setParam(1174, correctionInfo); /* записываем собранный массив байтов в тег 1174 */
if (res < 0) {return "сост ин "+Fptr.errorDescription()};
res = Fptr.setParam(1173, 0); /* тег 1173 - "Тип коррекции"*/
if (res < 0) {return "тип кор "+Fptr.errorDescription()};
//res = Fptr.setParam(1192,"1452306898"); //указав фискальный признак ошибочного чека (по тегу 1192 «дополнительные реквизиты чека»).
//Fptr.setParam(Fptr.LIBFPTR_PARAM_RECEIPT_ELECTRONICALLY, true); /* Чтобы чек не печатался (электронный чек), нужно установить параметру LIBFPTR_PARAM_RECEIPT_ELECTRONICALLY значение true. */
if (res < 0) {return "доп "+Fptr.errorDescription()};
res = Fptr.openReceipt();
if (res < 0) {return "откр "+Fptr.errorDescription()};
res = Fptr.setParam(Fptr.LIBFPTR_PARAM_COMMODITY_NAME, "тест кор 2108"); /* LIBFPTR_PARAM_COMMODITY_NAME - название товара */
if (res < 0) {return "тов "+Fptr.errorDescription()};
res = Fptr.setParam(Fptr.LIBFPTR_PARAM_PRICE, 0.01); /* LIBFPTR_PARAM_PRICE - цена за единицу */ 
if (res < 0) {return "цен "+Fptr.errorDescription()};
res = Fptr.setParam(Fptr.LIBFPTR_PARAM_QUANTITY, 1); /* LIBFPTR_PARAM_QUANTITY - количество единиц товара */
if (res < 0) {return "кол "+Fptr.errorDescription()};
res = Fptr.setParam(Fptr.LIBFPTR_PARAM_TAX_TYPE, Fptr.LIBFPTR_TAX_NO); /* LIBFPTR_PARAM_TAX_TYPE - номер налоговой ставки, LIBFPTR_TAX_NO - не облагается */
if (res < 0) {return "ндс "+Fptr.errorDescription()};
res = Fptr.setParam(1212, 0); /* тег 1212	Признак предмета расчета*/
if (res < 0) {return "пр рас "+Fptr.errorDescription()};
res = Fptr.setParam(2108, 0); /*2108	Мера количества предмета расчета	int	≥ 1.2*/
if (res < 0) {return "едизм "+Fptr.errorDescription()};
res = Fptr.registration(); /* выполняем метод registration() для регистрации позиции */
if (res < 0) {return "рег поз "+Fptr.errorDescription()};
res = Fptr.setParam(Fptr.LIBFPTR_PARAM_PAYMENT_TYPE, Fptr.LIBFPTR_PT_CASH); /* LIBFPTR_PARAM_PAYMENT_TYPE - способ расчета, LIBFPTR_PT_CASH - наличными */
if (res < 0) {return "нал "+Fptr.errorDescription()};
res = Fptr.setParam(Fptr.LIBFPTR_PARAM_PAYMENT_SUM, 0.01); /* LIBFPTR_PARAM_PAYMENT_SUM - сумму расчета */
if (res < 0) {return "нал сум "+Fptr.errorDescription()};
res = Fptr.payment(); /* выполняем метод payment() для регистрации оплаты чека */
if (res < 0) {return "опл "+Fptr.errorDescription()};
res = Fptr.closeReceipt(); /* выполняем метод closeReceipt() для закрытия чека */
if (res < 0) {return "закр "+Fptr.errorDescription()};
if (Fptr.checkDocumentClosed() < 0) { // Не удалось проверить состояние документа. Вывести пользователю текст ошибки, попросить устранить неполадку и повторить запрос
	return Fptr.errorDescription();
}
if (!Fptr.getParamBool(Fptr.LIBFPTR_PARAM_DOCUMENT_CLOSED)) // Документ не закрылся. Требуется его отменить (если это чек) и сформировать заново
{	Fptr.cancelReceipt();
	return Fptr.errorDescription();
}
if (!Fptr.getParamBool(Fptr.LIBFPTR_PARAM_DOCUMENT_PRINTED)) {// Можно сразу вызвать метод допечатывания документа, он завершится с ошибкой, если это невозможно
	if (Fptr.continuePrint() < 0){// Если не удалось допечатать документ - показать пользователю ошибку и попробовать еще раз.
		return Fptr.errorDescription();
	}
}
return true;
