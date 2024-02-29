sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/m/MessageBox"],
  /**
   * @param {typeof sap.ui.core.mvc.Controller} Controller
   */
  function (Controller, MessageBox) {
    "use strict";

    return Controller.extend("zbereitschaftseinsatz.controller.View1", {
      onInit: function () {
        this.oModel = this.getOwnerComponent().getModel();
        this.jsModel = this.getOwnerComponent().getModel("js");
        this.i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
        this.getPernr();
        this.getRequests();
      },

      getRequests: function (oEvent) {
        this.closeMsgStrip();
        this.openPanel(false);

        sap.ui.core.BusyIndicator.show(0);
        this.oModel.read("/fillTableSet", {
          success: $.proxy(function (data, resp) {
            sap.ui.core.BusyIndicator.hide();
            this.jsModel.setProperty("/requests", data.results);
          }, this),
          error: $.proxy(function (oError) {
            sap.ui.core.BusyIndicator.hide();
            this.showMsgStrip(JSON.parse(error.responseText).error.message.value, "Error");
          }, this),
        });
      },
      onCopyButtonPress: function (oEvent) {
        this.closeMsgStrip();
        this.openPanel(true);
        var selectedTabline = this.getSelectedTableLine(oEvent);
        if (selectedTabline === null) {
          return;
        }
        // Convert the selected date strings to Date objects
        var startDate = new Date(selectedTabline.startDate);
        var endDate = new Date(selectedTabline.endDate);
        // Set the formatted dates to the DatePicker controls
        this.jsModel.setProperty("/newEntry/startDate", startDate);
        this.jsModel.setProperty("/newEntry/endDate", endDate);

        // Set other properties as before
        this.jsModel.setProperty(
          "/newEntry/startTime",
          this.convertToDateObject(selectedTabline.startTime)
        );
        this.jsModel.setProperty(
          "/newEntry/endTime",
          this.convertToDateObject(selectedTabline.endTime)
        );
        this.jsModel.setProperty("/newEntry/reasonText", selectedTabline.reasonText);
      },
      onDeleteButtonPress: function (oEvent) {
        oEvent.getSource().getParent().getParent();
        this.closeMsgStrip();
        var selectedTabline = this.getSelectedTableLine(oEvent);
        if (selectedTabline === null) {
          return;
        }
        var that = this;
        MessageBox.show(this.i18n.getText("msgboxQuestion"), {
          icon: MessageBox.Icon.QUESTION,
          title: this.i18n.getText("msgboxTitle"),
          actions: [MessageBox.Action.YES, MessageBox.Action.NO],
          onClose: function (oAction) {
            if (oAction === MessageBox.Action.YES) {
              that.deleteRequest(selectedTabline, that);
            }
          },
        });
      },
      onModifyButtonPress: function (oEvent) {
        this.closeMsgStrip();
        this.openPanel(true);
        this.onCopyButtonPress(oEvent);
        this.openModifyBtn(true);
      },
      onModifyAction: function (oEvent) {
        var that = this;
        debugger;
        var selectedTabline = this.getSelectedTableLine();

        this.deleteRequest(selectedTabline, that)
          .then(function () {
            debugger;
            that.onAddButtonPress();
            that.openModifyBtn(false);
          })
          .catch(function (error) {
            console.error("Delete request error:", error);
          });
      },
      deleteRequest: function (selectedTabline, that) {
        return new Promise(function (resolve, reject) {
          var sPath = that.oModel.createKey("/deleteEntrySet", {
            pernr: that.jsModel.getProperty("/pernr"),
            startDate: selectedTabline.startDate,
            endDate: selectedTabline.endDate,
            subty: selectedTabline.subty,
            seqnr: selectedTabline.seqnr,
          });

          sap.ui.core.BusyIndicator.show(0);
          that.oModel.remove(sPath, {
            success: function (oData, oResponse) {
              sap.ui.core.BusyIndicator.hide();
              that.showMsgStrip(that.i18n.getText("successMsg"), "Success");
              that.getRequests();
              resolve(); // Başarıyla tamamlandığında Promise'i çöz
            },
            error: function (oError) {
              sap.ui.core.BusyIndicator.hide();
              that.showMsgStrip(JSON.parse(oError.responseText).error.message.value, "Error");
              reject(oError); // Hata oluştuğunda Promise'i reddet
            },
          });
        });
      },
      valueStatesControl: function (newEntry) {
        this.jsModel.setProperty(
          "/newEntry/startDateVs",
          newEntry.startDate !== null && newEntry.startDate !== ""
        );
        this.jsModel.setProperty(
          "/newEntry/endDateVs",
          newEntry.endDate !== null && newEntry.endDate !== ""
        );
        this.jsModel.setProperty(
          "/newEntry/startTimeVs",
          newEntry.startTime !== null && newEntry.startTime !== ""
        );
        this.jsModel.setProperty(
          "/newEntry/endTimeVs",
          newEntry.endTime !== null && newEntry.endTime !== ""
        );
        this.jsModel.setProperty(
          "/newEntry/reasonTextVs",
          newEntry.reasonText !== null && newEntry.reasonText !== ""
        );
        if (
          newEntry.startDate == null ||
          newEntry.startDate == "" ||
          newEntry.endDate == null ||
          newEntry.endDate == "" ||
          newEntry.startTime == null ||
          newEntry.startTime == "" ||
          newEntry.endTime == null ||
          newEntry.endTime == "" ||
          newEntry.reasonText == null ||
          newEntry.reasonText == ""
        ) {
          this.showMsgStrip(this.i18n.getText("requiredMsg"), "Error");
          return false;
        } else {
          this.closeMsgStrip();
          return true;
        }
      },
      onAddButtonPress: function (oEvent) {
        this.closeMsgStrip();
        var newEntry = this.jsModel.getProperty("/newEntry");
        if (this.valueStatesControl(newEntry) == false) {
          return;
        }
        var payload = {};
        payload = {
          pernr: this.jsModel.getProperty("/pernr"),
          startDate: newEntry.startDate,
          endDate: newEntry.endDate,
          startTime: this.converttohhmmss(newEntry.startTime),
          endTime: this.converttohhmmss(newEntry.endTime),
          reasonText: newEntry.reasonText,
        };

        sap.ui.core.BusyIndicator.show(0);
        this.oModel.create("/addNewEntrySet", payload, {
          success: $.proxy(function (data, resp) {
            sap.ui.core.BusyIndicator.hide();
            sap.m.MessageBox.success(this.i18n.getText("successPopup"), {
              actions: [MessageBox.Action.OK],
              emphasizedAction: MessageBox.Action.OK,
              onClose: function (sAction) {}.bind(this),
            });
            this.getRequests();
            this.onClearButtonPress();
          }, this),
          error: $.proxy(function (error) {
            sap.ui.core.BusyIndicator.hide();
            this.showMsgStrip(JSON.parse(error.responseText).error.message.value, "Error");
          }, this),
        });
      },
      getSelectedTableLine: function (oEvent) {
        try {
          var selectedTabline = this.jsModel.getProperty(
            oEvent.getSource().getParent().getBindingContextPath()
          );
          this.jsModel.setProperty(
            "/eventTabPath",
            oEvent.getSource().getParent().getBindingContextPath()
          );
          return selectedTabline;
        } catch (error) {
          selectedTabline = this.jsModel.getProperty(this.jsModel.getProperty("/eventTabPath"));
          return selectedTabline;
        }
      },
      showMsgStrip: function (msg, msgType) {
        this.jsModel.setProperty("/message/errorMsg", msg);
        this.jsModel.setProperty("/message/errorType", msgType);
        this.jsModel.setProperty("/message/visible", true);
      },
      closeMsgStrip: function () {
        this.jsModel.setProperty("/message/visible", false);
      },
      onClearButtonPress: function (oEvent) {
        this.jsModel.setProperty("/newEntry/startDate", "");
        this.jsModel.setProperty("/newEntry/endDate", "");
        this.jsModel.setProperty("/newEntry/startTime", "");
        this.jsModel.setProperty("/newEntry/endTime", "");
        this.jsModel.setProperty("/newEntry/reasonText", "");
      },

      getPernr: function (oEvent) {
        var pernr = "X";
        this.oModel.read("/getPernrSet('" + pernr + "')", {
          success: function (data, resp) {
            this.jsModel.setProperty("/pernr", data.pernr);
          }.bind(this),
          error: function (oError) {
            this.showMsgStrip(JSON.parse(error.responseText).error.message.value, "Error");
          }.bind(this),
        });
      },
      converttohhmmss: function (object) {
        var hours = object.getHours();
        var minutes = object.getMinutes();
        var seconds = object.getSeconds();
        var timeString =
          hours.toString().padStart(2, "0") +
          ":" +
          minutes.toString().padStart(2, "0") +
          ":" +
          seconds.toString().padStart(2, "0");
        var oTimeType = new sap.ui.model.odata.type.Time();
        var edmTimeObject = oTimeType.parseValue(timeString, "string");
        return edmTimeObject;
      },
      openModifyBtn: function (visible) {
        this.jsModel.setProperty("/button/mdfBtn", visible);
        this.jsModel.setProperty("/button/addBtn", !visible);
      },
      convertToDateObject: function (time) {
        var hours = time.ms / (1000 * 60 * 60);
        var minutes = Math.round((hours - Math.floor(hours)) * 60);
        // var seconds = (minutes - Math.floor(minutes)) * 60;
        return new Date(0, 0, 0, Math.floor(hours), minutes, "00");
      },
      visibleCnclBtn: function (visible) {
        this.jsModel.setProperty("/button/cnclBtn", data.results);
      },
      openPanel: function (visible) {
        var oPanel = this.getView().byId("pnl1");
        oPanel.setExpanded(visible);
      },
    });
  }
);
