import { Injectable, NgZone } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable()
export class GadgetService {

  constructor(private zone: NgZone) { }

  /**
   * 取得 Contract 連接。
   * @param contractName 名稱。
   */
  public async getContract(contractName: string): Promise<Contract> {

    const contract = gadget.getContract(contractName);

    return new Promise<any>((r, j) => {
      contract.ready(() => {
        r(new Contract(contract, this.zone));
      });

      contract.loginFailed((err: any) => {
        j(err);
      });
    });
  }

  /**
   * 連接指定之 dsns 與 contract。
   * @param contractName 名稱。
   */
  public async Connect(dsns: string, contractName: string): Promise<Contract> {
    if (!dsns.endsWith('/')) dsns += '/';

    const contract = gadget.connect(dsns + contractName);

    return new Promise<any>((r, j) => {
      contract.ready(() => {
        r(new Contract(contract, this.zone));
      });

      contract.loginFailed((err: any) => {
        j(err);
      });
    });
  }
}

/**
 * 代表已連接的 Contract。
 */
export class Contract {

  constructor(private contract: any, private zone: NgZone) { }

  /**
   * 呼叫 dsa service。
   */
  public send(serviceName: string, body: any = {}): Promise<any> {
    return new Promise<any>((r,j) => {
      this.contract.send({
        service: serviceName,
        body: body,
        result: (rsp: any, err: any, xmlhttp: any) => {
          if(err) {
            j(err);
          } else {
            r(rsp);
          }
        }
      });
    });
  }

  /**
   * 取得使用者資訊。
   */
  public get getUserInfo(): any {
    return this.contract.getUserInfo();
  }

  /**
   * 取得連接主機。
   */
  public get getAccessPoint(): any {
    return this.contract.getAccessPoint();
  }
}

// var allowDSA = { connA: false, connB: false };
// var connA = gadget.connect('https://1admin-ap.ischool.com.tw/dsa4/chhs.hcc.edu.tw/chhs.teacher.service');
// connA.ready(function(){allowDSA.connA=true;});
// connA.loginFailed(function(){allowDSA.connA=false;});
// var connB = gadget.connect('https://1admin-ap.ischool.com.tw/dsa4/j.chhs.hcc.edu.tw/chhs.teacher.service');
// connB.ready(function(){allowDSA.connB=true;});
// connB.loginFailed(function(){allowDSA.connB=false;});
