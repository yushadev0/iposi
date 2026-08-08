object MainForm: TMainForm
  Left = 0
  Top = 0
  ClientHeight = 600
  ClientWidth = 800
  Caption = 'MainForm'
  BorderStyle = bsNone
  WindowState = wsMaximized
  OldCreateOrder = False
  MonitoredKeys.Keys = <>
  OnAfterShow = UniFormAfterShow
  OnCreate = UniFormCreate
  TextHeight = 15
  object MainHTML: TUniHTMLFrame
    Left = 0
    Top = 0
    Width = 800
    Height = 600
    Hint = ''
    Align = alClient
    OnAjaxEvent = MainHTMLAjaxEvent
  end
end
