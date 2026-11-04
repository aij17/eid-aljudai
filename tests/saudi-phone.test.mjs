import assert from 'node:assert/strict';
import {saudiLocalPhone,saudiInternationalPhone} from '../lib/saudi-phone.ts';
for(const phone of ['0501234567','٥٠١٢٣٤٥٦٧','٠٥٠١٢٣٤٥٦٧','+966501234567','00966501234567','966501234567','050 123 4567']){assert.equal(saudiLocalPhone(phone),'0501234567');assert.equal(saudiInternationalPhone(phone),'+966501234567')}
for(const phone of ['+12025551234','0501234','+9660501234567',''])assert.equal(saudiInternationalPhone(phone),'');
console.log('PASS: Saudi local and international numbers, Arabic digits, exactly one country prefix, invalid numbers');
