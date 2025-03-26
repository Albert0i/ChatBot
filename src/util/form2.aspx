<%@ Page Language="C#" AutoEventWireup="true" CodeFile="form2.aspx.cs" Inherits="Mysite_form2" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml" >
<head runat="server">
    <title>Form2</title>
</head>
<body onbeforeunload="return exitFunction()">
    <h3>Form2</h3>
    <form id="form2" runat="server">
    <div>
        <p>
            <asp:TextBox ID="name" runat="server" value="" ></asp:TextBox>
        </p>
        <p>
            <asp:HiddenField ID="saveStatus" runat="server" Value="unsaved" />
        </p>
        <p>
            <asp:Button ID="Button1" runat="server" Text="Save" OnClick="Button1_Click" OnClientClick="toggleSaveStatus()" />
        </p>
        <p>
            <asp:HyperLink ID="HyperLink1" runat="server" NavigateUrl="https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event" Target="_blank" onclick="toggleSaveStatus()">Save</asp:HyperLink>
        </p>
    </div>
    </form>

    <script language="javascript" type="text/javascript">
        const saveStatus = document.getElementById("saveStatus")
        const nameInput = document.getElementById("name")
        
        function toggleSaveStatus() {            
            saveStatus.value = saveStatus.value === "unsaved" ? "saved" : "unsaved";
        }

        function exitFunction() {
            if (saveStatus.value === "saved") 
                return null;
            else 
                return true;
        }
    </script>    
</body>
</html>
