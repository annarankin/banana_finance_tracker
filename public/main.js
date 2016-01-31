console.log('main.js linked');

$(function() {

  // Template for the billz yo
  var billTemplate = Handlebars.compile( $('#bill-template').html() );
  // On page load, make dat ajax call for the bills
  $.ajax({
    url: '/api/bills',
    method: 'GET',
    dataType: 'json',
    success: function(data) {
      data.forEach(renderBill);
    }
  });
  // Handle new bill submission asynchronously
  $('#new-bill').on('click', function(event) {
    event.preventDefault();
    var formInfo = {};
    $('#bill-form').find('input').each(function(idx, element) {
      formInfo[element.name] = element.value;
    });
    $.ajax({
      url: 'api/bills',
      method: 'POST',
      dataType: 'json',
      data: formInfo,
      success: renderBill
    });
  });


  function renderBill (bill) {
    var rendered = billTemplate(bill);
    $('#bills').append(rendered);
  }
});