object LOGIN_FORM: TLOGIN_FORM
  Left = 0
  Top = 0
  ClientHeight = 600
  ClientWidth = 800
  Caption = 'LOGIN_FORM'
  BorderStyle = bsNone
  WindowState = wsMaximized
  OldCreateOrder = False
  MonitoredKeys.Keys = <>
  OnAfterShow = UniLoginFormAfterShow
  OnCreate = UniLoginFormCreate
  TextHeight = 15
  object LoginHTML: TUniHTMLFrame
    Left = 0
    Top = 0
    Width = 800
    Height = 600
    Hint = ''
    Align = alClient
    OnAjaxEvent = LoginHTMLAjaxEvent
  end
end
